import { DirectoryId, DirectoryInfo } from "./directoryStore/DirectoryBase";
import { fileDragDropHandlers } from "./fileDragDrop";

// Find the closest row index based on mouse position
function findClosestRowIndex(
  e: React.MouseEvent,
  directoryId: DirectoryId,
): number | null {
  const container = e.currentTarget as HTMLElement;
  // Check if container itself has data-list-id, otherwise query inside
  const listElement =
    container.getAttribute("data-list-id") === directoryId
      ? container
      : container.querySelector(`[data-list-id="${directoryId}"]`);
  if (!listElement) return null;

  const items = listElement.querySelectorAll("[data-list-item]");
  if (items.length === 0) return null;

  const mouseY = e.clientY;

  // Find the row closest to the click position
  let closestIdx = 0;
  let closestDistance = Infinity;

  items.forEach((item, idx) => {
    const rect = item.getBoundingClientRect();
    const itemCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(mouseY - itemCenterY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIdx = idx;
    }
  });

  // If click is below all items, return the last index
  const lastItem = items[items.length - 1];
  if (lastItem) {
    const lastRect = lastItem.getBoundingClientRect();
    if (mouseY > lastRect.bottom) {
      return items.length - 1;
    }
  }

  return closestIdx;
}

export function fileBrowserListContainerProps({
  directory,
  directoryId,
}: {
  directory: DirectoryInfo;
  directoryId: DirectoryId;
}): React.HTMLAttributes<HTMLElement> {
  return {
    onMouseDown: (e) => {
      if (e.button !== 0) return;

      // Only handle clicks on empty space (not on rows)
      const target = e.target as HTMLElement;
      const isOnRow = target.closest("[data-list-item]") !== null;
      if (isOnRow) return;

      // Don't start drag-to-select on header clicks
      const isOnHeader = target.closest("thead") !== null;
      if (isOnHeader) return;

      // Find the closest row to start selection from
      const startIdx = findClosestRowIndex(e, directoryId);
      if (startIdx === null) return;

      // Prevent text selection while drag-to-select is active
      e.preventDefault();

      // Pass the scroll container for auto-scroll support
      const scrollContainer = e.currentTarget as HTMLElement;

      fileDragDropHandlers.startDragToSelect(
        startIdx,
        directoryId,
        e.metaKey,
        { x: e.clientX, y: e.clientY },
        scrollContainer,
      );
    },
    onDragOver: (e) => fileDragDropHandlers.handleTableDragOver(e, directoryId),
    onDragLeave: fileDragDropHandlers.handleTableDragLeave,
    onDrop: (e) =>
      fileDragDropHandlers.handleTableDrop(
        e,
        directoryId,
        directory.type,
        directory.type === "path" ? directory.fullPath : undefined,
      ),
  };
}
