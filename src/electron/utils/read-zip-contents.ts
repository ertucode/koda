import AdmZip from "adm-zip";
import { expandHome } from "./expand-home.js";
import { GenericError, GenericResult } from "../../common/GenericError.js";
import { Result } from "../../common/Result.js";

export type ZipEntry = {
  name: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
  comment: string;
};

export async function readZipContents(
  zipFilePath: string,
): Promise<GenericResult<ZipEntry[]>> {
  try {
    const expandedPath = expandHome(zipFilePath);
    const zip = new AdmZip(expandedPath);
    const entries = zip.getEntries();

    const result: ZipEntry[] = entries.map((entry) => ({
      name: entry.entryName,
      isDirectory: entry.isDirectory,
      size: entry.header.size,
      compressedSize: entry.header.compressedSize,
      comment: entry.comment,
    }));

    return Result.Success(result);
  } catch (error) {
    if (error instanceof Error) {
      return GenericError.Message(error.message);
    }
    return GenericError.Unknown(error);
  }
}
