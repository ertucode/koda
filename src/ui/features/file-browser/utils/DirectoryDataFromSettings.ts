import { GetFilesAndFoldersInDirectoryItem } from "@common/Contracts";
import { FileBrowserSettings } from "../settings";
import { SortState } from "../schemas";

export class DirectoryDataFromSettings {
  static lastSettings: FileBrowserSettings | undefined;
  static lastSort: SortState | undefined;
  static lastData: GetFilesAndFoldersInDirectoryItem[] | undefined;
  static lastResult: GetFilesAndFoldersInDirectoryItem[] | undefined;

  static getDirectoryData(
    d: GetFilesAndFoldersInDirectoryItem[],
    settings: FileBrowserSettings,
    sort: SortState,
  ) {
    if (
      equalStringified(settings, this.lastSettings) &&
      equalStringified(sort, this.lastSort) &&
      d === this.lastData
    ) {
      return this.lastResult!;
    }
    this.lastSettings = settings;
    this.lastSort = sort;
    this.lastData = d;
    this.lastResult = this.getDirectoryDataWithoutCache(d, settings, sort);
    return this.lastResult;
  }

  private static getDirectoryDataWithoutCache(
    d: GetFilesAndFoldersInDirectoryItem[],
    settings: FileBrowserSettings,
    sort: SortState,
  ) {
    let data = d;

    if (!settings.showDotFiles)
      data = data.filter((i) => !i.name.startsWith("."));

    // Filter by file type category (always show folders)
    if (settings.fileTypeFilter && settings.fileTypeFilter !== "all") {
      data = data.filter(
        (i) => i.type === "dir" || i.category === settings.fileTypeFilter,
      );
    }

    // Apply sorting if sort state exists
    if (sort?.by) {
      if (sort.by === "name") {
        const times = sort.order === "asc" ? 1 : -1;
        data = data
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name) * times);
      } else if (sort.by === "modifiedTimestamp") {
        const times = sort.order === "asc" ? 1 : -1;
        data = data.slice().sort((a, b) => {
          if (!a.modifiedTimestamp && !b.modifiedTimestamp) return 0;
          if (!a.modifiedTimestamp) return -1;
          if (!b.modifiedTimestamp) return 1;
          return (a.modifiedTimestamp - b.modifiedTimestamp) * times;
        });
      } else if (sort.by === "size") {
        const times = sort.order === "asc" ? 1 : -1;
        data = data.slice().sort((a, b) => {
          if (!a.size && !b.size) return 0;
          if (!a.size) return 1;
          if (!b.size) return -1;
          return (a.size - b.size) * times;
        });
      } else if (sort.by === "ext") {
        const times = sort.order === "asc" ? 1 : -1;
        data = data.slice().sort((a, b) => {
          if (!a.ext && !b.ext) return 0;
          if (!a.ext) return 1;
          if (!b.ext) return -1;
          return a.ext.localeCompare(b.ext) * times;
        });
      }
    }

    if (settings.foldersOnTop) {
      data = data.slice().sort((a, b) => {
        if (a.type === "dir" && b.type !== "dir") return -1;
        if (a.type !== "dir" && b.type === "dir") return 1;
        return 0;
      });
    }

    return data;
  }
}

function equalStringified<T>(a: T, b: T | undefined) {
  if (b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
