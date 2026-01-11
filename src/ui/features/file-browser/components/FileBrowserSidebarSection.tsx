import { type ReactNode, useState } from "react";
import { clsx } from "@/lib/functions/clsx";
import {
  ContextMenu,
  ContextMenuList,
  useContextMenu,
  type ContextMenuItem,
} from "@/lib/components/context-menu";
import { fileDragDropHandlers } from "../fileDragDrop";

interface FileBrowserSidebarSectionProps<T> {
  items: T[];
  render: (item: T) => ReactNode;
  emptyMessage: ReactNode;
  isSelected: (item: T) => boolean;
  onClick: (item: T) => void;
  getKey: (item: T) => string;
  className?: string;
  getContextMenuItems?: (item: T) => (ContextMenuItem | false | undefined)[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  isDraggable?: boolean;
  onExternalDrop?: (e: React.DragEvent, insertIndex: number) => void;
  acceptsExternalDrop?: boolean;
}

export function FileBrowserSidebarSection<T>({
  items,
  render,
  emptyMessage,
  isSelected,
  onClick,
  getKey,
  className = "",
  getContextMenuItems,
  onReorder,
  isDraggable = false,
  onExternalDrop,
  acceptsExternalDrop = false,
}: FileBrowserSidebarSectionProps<T>) {
  const contextMenu = useContextMenu<T>();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Check if this is an external drag (from file table)
  // Works with both HTML5 drag (dataTransfer) and native drag (activeDrag in store)
  const isExternalDrag = (e: React.DragEvent): boolean => {
    if (!acceptsExternalDrop || draggedIndex !== null) return false;
    // Check dataTransfer for HTML5 drag
    if (e.dataTransfer.types.includes("application/x-mygui-file-drag")) {
      return true;
    }
    // For native drag, check store AND that drag contains files
    // (prevents false positives from flexlayout tab drags)
    const activeDrag = fileDragDropHandlers.getActiveDrag();
    if (activeDrag !== null && e.dataTransfer.types.includes("Files")) {
      return true;
    }
    return false;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isDraggable || !onReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    // Handle external drops
    if (isExternalDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setDragOverIndex(index);
      return;
    }

    // Handle internal reordering
    if (!isDraggable || !onReorder || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    // Handle external drops
    if (isExternalDrag(e) && onExternalDrop) {
      e.preventDefault();
      e.stopPropagation();
      onExternalDrop(e, toIndex);
      setDragOverIndex(null);
      return;
    }

    // Handle internal reordering
    if (!isDraggable || !onReorder || draggedIndex === null) return;
    e.preventDefault();
    onReorder(draggedIndex, toIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    if (!isDraggable || !onReorder) return;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <div
        className={clsx(
          "flex flex-col max-h-full gap-1 pr-2 overflow-hidden pt-2 bg-base-100 h-full",
          className,
        )}
      >
        <div
          className="flex flex-col gap-1 overflow-y-auto min-h-0 flex-1"
          onDragOver={
            acceptsExternalDrop
              ? (e) => {
                  if (isExternalDrag(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "copy";
                    // Set drag over to the end (append position) when dragging over container
                    setDragOverIndex(items.length);
                  }
                }
              : undefined
          }
          onDrop={
            acceptsExternalDrop
              ? (e) => {
                  if (isExternalDrag(e) && onExternalDrop) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Drop at the end when dropping on container
                    onExternalDrop(e, items.length);
                    setDragOverIndex(null);
                  }
                }
              : undefined
          }
          onDragLeave={
            acceptsExternalDrop
              ? (e) => {
                  // Only clear if we're actually leaving the container
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isOutside =
                    e.clientX < rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY < rect.top ||
                    e.clientY >= rect.bottom;

                  if (isOutside) {
                    setDragOverIndex(null);
                  }
                }
              : undefined
          }
        >
          {items.length === 0 ? (
            <div className="text-xs text-gray-500 pl-2">{emptyMessage}</div>
          ) : (
            <>
              {items.map((item, index) => (
                <div
                  key={getKey(item)}
                  role="button"
                  tabIndex={0}
                  draggable={isDraggable}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnter={(e) => {
                    if (isExternalDrag(e)) {
                      e.preventDefault();
                    }
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    "flex items-center gap-2 hover:bg-base-200 rounded text-xs py-1 px-2 cursor-pointer transition-all",
                    isSelected(item) && "bg-base-300",
                    draggedIndex === index && "opacity-50",
                    dragOverIndex === index && "border-t-2 border-blue-500",
                  )}
                  onClick={() => onClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick(item);
                    }
                  }}
                  onContextMenu={
                    getContextMenuItems
                      ? (e) => contextMenu.onRightClick(e, item)
                      : undefined
                  }
                >
                  {render(item)}
                </div>
              ))}
              {(isDraggable || acceptsExternalDrop) && items.length > 0 && (
                <div
                  onDragOver={(e) => handleDragOver(e, items.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, items.length)}
                  className={clsx(
                    "min-h-8 flex-1 rounded transition-all mt-1",
                    dragOverIndex === items.length &&
                      "bg-blue-500/20 border-2 border-dashed border-blue-500",
                  )}
                >
                  {dragOverIndex === items.length && (
                    <div className="flex items-center justify-center h-full text-xs text-blue-500 opacity-70"></div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {contextMenu.isOpen && contextMenu.item && getContextMenuItems && (
        <ContextMenu menu={contextMenu}>
          <ContextMenuList items={getContextMenuItems(contextMenu.item)} />
        </ContextMenu>
      )}
    </>
  );
}
