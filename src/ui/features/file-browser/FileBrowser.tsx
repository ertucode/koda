import {
  directoryStore,
  directoryHelpers,
  selectSelection,
  directoryDerivedStores,
} from "./directory";
import { useSelector } from "@xstate/store/react";

import { FilePreview } from "./components/FilePreview";
import { useDialogStoreRenderer } from "./dialogStore";
import "./pane.css";

import { FileBrowserShortcuts } from "./FileBrowserShortcuts";
import { DirectoryTablePane } from "./components/DirectoryTablePane";
import { FavoritesList } from "./components/FavoritesList";
import { RecentsList } from "./components/RecentsList";
import { TagsList } from "./components/TagsList";
import { FileBrowserOptionsSection } from "./components/FileBrowserOptionsSection";

// Simple FileBrowser without tiling - just a basic layout
export function FileBrowser() {
  const dialogs = useDialogStoreRenderer();

  const directories = useSelector(
    directoryStore,
    (s) => s.context.directoryOrder,
  );

  return (
    <div className="flex flex-col items-stretch h-full p-6 overflow-hidden">
      {dialogs.RenderOutside}
      <FileBrowserShortcuts />
      
      {/* Options Section */}
      <div className="mb-4">
        <FileBrowserOptionsSection />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-w-0 min-h-0 flex gap-4">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-4 overflow-auto">
          <div className="border rounded p-2">
            <h4 className="text-xs font-semibold mb-2">Favorites</h4>
            <FavoritesList />
          </div>
          <div className="border rounded p-2">
            <h4 className="text-xs font-semibold mb-2">Recents</h4>
            <RecentsList />
          </div>
          <div className="border rounded p-2">
            <h4 className="text-xs font-semibold mb-2">Tags</h4>
            <TagsList />
          </div>
        </div>

        {/* Middle - Directory Tables */}
        <div className="flex-1 overflow-hidden min-w-0">
          {directories.length > 0 ? (
            <div className="h-full flex flex-col gap-2">
              {directories.map((dirId) => (
                <div key={dirId} className="flex-1 min-h-0 border rounded p-2">
                  <DirectoryTablePane directoryId={dirId} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border rounded">
              <p className="text-gray-500">No directories open</p>
            </div>
          )}
        </div>

        {/* Right - Preview */}
        <div className="w-80 overflow-auto border rounded p-2">
          <h4 className="text-xs font-semibold mb-2">Preview</h4>
          <FileBrowserFilePreview />
        </div>
      </div>
    </div>
  );
}

function FileBrowserFilePreview() {
  const activeDirectoryId = useSelector(
    directoryStore,
    (s) => s.context.activeDirectoryId,
  );
  const selection = useSelector(
    directoryStore,
    selectSelection(activeDirectoryId),
  );
  const filteredDirectoryData = directoryDerivedStores
    .get(activeDirectoryId)
    ?.useFilteredDirectoryData();
  
  // Get selected file for preview (only if exactly one file is selected)
  const selectedItem =
    filteredDirectoryData && selection.indexes.size === 1 && selection.last != null
      ? filteredDirectoryData[selection.last]
      : null;
  const previewFilePath =
    selectedItem && selectedItem.type === "file"
      ? (selectedItem.fullPath ??
        directoryHelpers.getFullPath(selectedItem.name, activeDirectoryId))
      : null;

  return (
    <FilePreview
      filePath={previewFilePath}
      isFile={selectedItem?.type === "file"}
      fileSize={selectedItem?.size}
      fileExt={selectedItem?.type === "file" ? selectedItem.ext : null}
      isResizing={false}
    />
  );
}
