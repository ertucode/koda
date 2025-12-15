import { DirectoryContextProvider } from "../DirectoryContext";
import { FileBrowserTable } from "../FileBrowserTable";
import { DirectoryId } from "../directory";

export function DirectoryTablePane({
  directoryId,
}: {
  directoryId: DirectoryId;
}) {
  return (
    <div className="relative flex flex-col min-h-0 min-w-0 h-full">
      <DirectoryContextProvider directoryId={directoryId}>
        <FileBrowserTable />
      </DirectoryContextProvider>
    </div>
  );
}
