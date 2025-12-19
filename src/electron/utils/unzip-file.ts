import AdmZip from "adm-zip";
import { expandHome } from "./expand-home.js";
import { GenericError, GenericResult } from "../../common/GenericError.js";
import { Result } from "../../common/Result.js";

export async function unzipFile(
	zipFilePath: string,
	destinationFolder: string
): Promise<GenericResult<{ path: string }>> {
	try {
		const expandedZipPath = expandHome(zipFilePath);
		const expandedDestination = expandHome(destinationFolder);

		const zip = new AdmZip(expandedZipPath);
		zip.extractAllTo(expandedDestination, false); // true = overwrite

		return Result.Success({ path: expandedDestination });
	} catch (error) {
		if (error instanceof Error) {
			return GenericError.Message(error.message);
		}
		return GenericError.Unknown(error);
	}
}
