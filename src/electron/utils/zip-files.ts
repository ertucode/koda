import AdmZip from "adm-zip";
import path from "path";
import { expandHome } from "./expand-home.js";
import { GenericError, GenericResult } from "../../common/GenericError.js";
import { Result } from "../../common/Result.js";

export async function zipFiles(
  filePaths: string[],
  destinationZipPath: string,
): Promise<GenericResult<{ path: string }>> {
  try {
    const zip = new AdmZip();

    // Add each file/folder to the zip
    for (const filePath of filePaths) {
      const expandedPath = expandHome(filePath);
      const baseName = path.basename(expandedPath);

      // Check if it's a directory or file
      const fs = await import("fs/promises");
      const stat = await fs.stat(expandedPath);

      if (stat.isDirectory()) {
        zip.addLocalFolder(expandedPath, baseName);
      } else {
        zip.addLocalFile(expandedPath);
      }
    }

    const expandedDestination = expandHome(destinationZipPath);
    // Ensure destination ends with .zip
    const finalPath = expandedDestination.endsWith(".zip")
      ? expandedDestination
      : `${expandedDestination}.zip`;

    zip.writeZip(finalPath);

    return Result.Success({ path: finalPath });
  } catch (error) {
    if (error instanceof Error) {
      return GenericError.Message(error.message);
    }
    return GenericError.Unknown(error);
  }
}
