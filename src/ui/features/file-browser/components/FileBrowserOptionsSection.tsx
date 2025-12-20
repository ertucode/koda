import { useSelector } from "@xstate/store/react";
import {
  FileCategoryFilter,
  FILE_TYPE_FILTER_OPTIONS,
  fileBrowserSettingsStore,
  selectSettings,
  fileBrowserSettingsHelpers,
} from "../settings";

export function FileBrowserOptionsSection() {
  const settings = useSelector(fileBrowserSettingsStore, selectSettings);

  return (
    <div className="flex gap-3">
      <label className="label text-xs">
        <input
          type="checkbox"
          className="checkbox checkbox-xs"
          checked={settings.showDotFiles}
          onChange={() => fileBrowserSettingsHelpers.toggleShowDotFiles()}
        />
        Show dot files
      </label>
      <label className="label text-xs">
        <input
          type="checkbox"
          className="checkbox checkbox-xs"
          checked={settings.foldersOnTop}
          onChange={() => fileBrowserSettingsHelpers.toggleFoldersOnTop()}
        />
        Folders on top
      </label>
      <select
        className="select select-sm select-bordered w-32"
        value={settings.fileTypeFilter ?? "all"}
        onChange={(e) =>
          fileBrowserSettingsHelpers.setFileTypeFilter(
            e.target.value as FileCategoryFilter,
          )
        }
      >
        {FILE_TYPE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
