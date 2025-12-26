import fs from "fs";
import path from "path";
import archiver from "archiver";
import extract from "extract-zip";
import { PathHelpers } from "../../../common/PathHelpers.js";
import { Archive } from "./Archive.js";
import { Result } from "../../../common/Result.js";
import { GenericError } from "../../../common/GenericError.js";
import { getSizeForPath } from "../get-directory-size.js";

export namespace Zip {
  export function archive(
    opts: Archive.ArchiveOpts,
  ): Promise<Archive.ArchiveResult> {
    return new Promise<Archive.ArchiveResult>(async (resolve) => {
      const { source, destination, progressCallback, abortSignal } = opts;

      const zipPath = PathHelpers.withExtension(destination, ".zip");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      let settled = false;
      let completedSuccessfully = false;

      const cleanupPartialZip = async () => {
        if (completedSuccessfully) return;

        try {
          await fs.promises.unlink(zipPath);
        } catch (err: any) {
          // Ignore missing file or concurrent cleanup
          if (err?.code !== "ENOENT") {
            console.warn("Failed to cleanup partial zip:", err);
          }
        }
      };

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;

        archive.removeAllListeners();
        output.removeAllListeners();

        if (err) {
          // fire-and-forget cleanup
          void cleanupPartialZip();
          resolve(GenericError.Unknown(err));
        } else {
          completedSuccessfully = true;
          resolve(Result.Success(undefined));
        }
      };

      // -----------------
      // SUCCESS
      // -----------------
      output.on("close", () => {
        progressCallback?.(100); // Ensure we reach 100% on completion
        finish();
      });

      // -----------------
      // ERRORS
      // -----------------
      output.on("error", finish);
      archive.on("error", finish);

      archive.on("warning", (err) => {
        if (err.code !== "ENOENT") {
          finish(err);
        }
      });

      const sizes = await Promise.all(
        source.map((path) => getSizeForPath(path)),
      );
      const totalBytes = sizes.reduce((a, b) => a + b, 0);
      // -----------------
      // PROGRESS
      // -----------------
      if (progressCallback) {
        archive.on("progress", ({ fs }) => {
          progressCallback((fs.processedBytes / totalBytes) * 100);
        });
      }

      // -----------------
      // CANCELLATION
      // -----------------
      const cancel = () => {
        const err = new Error("Archive cancelled");

        archive.abort(); // stop compression
        output.destroy(err); // release fd immediately

        finish(err);
      };

      if (abortSignal.aborted) {
        return cancel();
      }
      abortSignal.addEventListener("abort", cancel, { once: true });

      // -----------------
      // PIPE + INPUT
      // -----------------
      archive.pipe(output);

      try {
        // Add all source files/directories to the archive
        for (const sourcePath of source) {
          if (
            fs.existsSync(sourcePath) &&
            fs.statSync(sourcePath).isDirectory()
          ) {
            archive.directory(
              sourcePath,
              PathHelpers.getLastPathPart(sourcePath),
            );
          } else {
            archive.file(sourcePath, {
              name: PathHelpers.getLastPathPart(sourcePath),
            });
          }
        }

        archive.finalize();
      } catch (err) {
        finish(err as Error);
      }
    });
  }

  export function unarchive(
    opts: Archive.UnarchiveOpts,
  ): Promise<Archive.UnarchiveResult> {
    return new Promise<Archive.UnarchiveResult>(async (resolve) => {
      if (fs.existsSync(opts.destination)) {
        resolve(GenericError.Message("Destination already exists"));
        return;
      }

      const {
        source, // .zip file
        destination, // folder
        progressCallback,
        abortSignal,
      } = opts;

      let settled = false;
      let completedSuccessfully = false;
      let aborted = false;

      const cleanupPartialExtract = async () => {
        if (completedSuccessfully) return;

        try {
          await fs.promises.rm(destination, {
            recursive: true,
            force: true,
          });
        } catch {
          // best-effort cleanup
        }
      };

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;

        if (err) {
          void cleanupPartialExtract();
          resolve(GenericError.Unknown(err));
        } else {
          completedSuccessfully = true;
          resolve(Result.Success(undefined));
        }
      };

      // -----------------
      // CANCELLATION
      // -----------------
      const cancel = () => {
        if (settled) return;
        aborted = true;
        finish(new Error("Unarchive cancelled"));
      };

      if (abortSignal.aborted) {
        return cancel();
      }
      abortSignal.addEventListener("abort", cancel, { once: true });

      // -----------------
      // EXTRACT
      // -----------------
      try {
        const fullPath = path.resolve(source);
        const fullOutputDir = path.resolve(destination);

        await extract(fullPath, {
          dir: fullOutputDir,
          onEntry: (entry, zipFile) => {
            // Check if extraction was aborted
            if (aborted) {
              throw new Error("Unarchive cancelled");
            }

            // Track progress based on entries (files) processed
            if (progressCallback && zipFile.entryCount > 0) {
              const progress = (zipFile.entriesRead / zipFile.entryCount) * 100;
              progressCallback(progress);
            }
          },
        });

        // Ensure we reach 100% on completion
        if (!aborted) {
          progressCallback?.(100);
          finish();
        }
      } catch (err) {
        finish(err as Error);
      }
    });
  }
}
