import { getCategoryFromFilename } from "./file-category.js";
import { PathHelpers } from "./PathHelpers.js";

export namespace ArchiveHelpers {
  export function getUnarchiveMetadata(fullPath: string) {
    const category = getCategoryFromFilename(fullPath);
    if (category !== "archive") return undefined;
    if (fullPath.endsWith(".dmg")) return undefined;
    return {
      archiveFilePath: fullPath,
      suggestedName: PathHelpers.getLastPathPart(
        PathHelpers.suggestUnarchiveName(fullPath),
      ),
      archiveType: "." + PathHelpers.getExtension(fullPath),
    };
  }
}
