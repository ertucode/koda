import { getCategoryFromFilename } from "./file-category";
import { PathHelpers } from "./PathHelpers";

export namespace ArchiveHelpers {
  export function getUnarchiveMetadata(fullPath: string) {
    if (!getCategoryFromFilename(fullPath)) return undefined;
    if (fullPath.endsWith(".dmg")) return undefined;
    return {
      archiveFilePath: fullPath,
      suggestedName: PathHelpers.suggestUnarchiveName(fullPath),
      archiveType: "." + PathHelpers.getExtension(fullPath),
    };
  }
}
