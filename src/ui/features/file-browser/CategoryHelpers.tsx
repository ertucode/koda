import { GetFilesAndFoldersInDirectoryItem } from "@common/Contracts";
import {
  ImageIcon,
  VideoIcon,
  MusicIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FolderIcon,
  CogIcon,
  PresentationIcon,
  TypeIcon,
} from "lucide-react";

export namespace CategoryHelpers {
  export type Category = GetFilesAndFoldersInDirectoryItem["category"];
  export type CategoryOrFolder = Category | "folder";
  export function getIcon(category: CategoryOrFolder) {
    return map[category] ?? map.other;
  }

  export function get(category: CategoryOrFolder) {
    return map[category] ?? map.other;
  }

  const map: Record<
    CategoryOrFolder,
    {
      icon: React.ComponentType<{ className?: string; fill?: string }>;
      colorClass: string;
      fill?: string;
    }
  > = {
    folder: {
      icon: FolderIcon,
      colorClass: "text-blue-500",
      fill: "currentColor",
    },
    image: { icon: ImageIcon, colorClass: "text-pink-500" },
    video: { icon: VideoIcon, colorClass: "text-purple-500" },
    audio: { icon: MusicIcon, colorClass: "text-orange-500" },
    document: { icon: FileTextIcon, colorClass: "text-red-500" },
    spreadsheet: { icon: FileSpreadsheetIcon, colorClass: "text-green-600" },
    presentation: { icon: PresentationIcon, colorClass: "text-amber-500" },
    archive: { icon: FileArchiveIcon, colorClass: "text-yellow-600" },
    code: { icon: FileCodeIcon, colorClass: "text-cyan-500" },
    font: { icon: TypeIcon, colorClass: "text-indigo-500" },
    executable: { icon: CogIcon, colorClass: "text-slate-500" },
    other: { icon: FileIcon, colorClass: "text-gray-400" },
  };
}
