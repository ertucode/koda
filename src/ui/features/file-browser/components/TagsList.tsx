import { PencilIcon, FolderIcon, FileIcon, Trash2Icon } from "lucide-react";
import {
  useTags,
  TAG_COLORS,
  TAG_COLOR_CLASSES,
  type TagColor,
} from "../hooks/useTags";
import { useDirectory } from "../hooks/useDirectory";
import { useState } from "react";
import { clsx } from "@/lib/functions/clsx";

interface TagsListProps {
  tags: ReturnType<typeof useTags>;
  d: ReturnType<typeof useDirectory>;
  className?: string;
}

type TagItem = {
  color: TagColor;
  name: string;
  files: string[];
};

export function TagsList({ tags, d, className }: TagsListProps) {
  const [editingTag, setEditingTag] = useState<TagColor | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedTag, setExpandedTag] = useState<TagColor | null>(null);

  const tagItems: TagItem[] = TAG_COLORS.map((color) => ({
    color,
    name: tags.getTagName(color),
    files: tags.getFilesWithTag(color),
  }));

  const handleStartEdit = (e: React.MouseEvent, tag: TagItem) => {
    e.stopPropagation();
    setEditingTag(tag.color);
    setEditValue(tag.name);
  };

  const handleSaveEdit = () => {
    if (editingTag && editValue.trim()) {
      tags.setTagName(editingTag, editValue.trim());
    }
    setEditingTag(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingTag(null);
      setEditValue("");
    }
  };

  const handleTagClick = (tag: TagItem) => {
    if (expandedTag === tag.color) {
      setExpandedTag(null);
    } else {
      setExpandedTag(tag.color);
    }
  };

  const handleFileClick = (fullPath: string) => {
    // Navigate to parent directory
    const parts = fullPath.split("/");
    parts.pop(); // Remove file name
    const parentDir = parts.join("/") || "/";
    d.cdFull(parentDir);
  };

  return (
    <div className={clsx("flex flex-col gap-1 pr-2 overflow-hidden", className)}>
      <h3 className="text-sm font-semibold pl-2 flex-shrink-0">Tags</h3>
      <div className="flex flex-col gap-1 overflow-y-auto min-h-0 flex-1">
        {tagItems.map((tag) => (
          <div key={tag.color}>
            <div
              className={clsx(
                "flex items-center gap-2 hover:bg-base-200 rounded text-xs h-6 px-2 cursor-pointer w-full group",
                expandedTag === tag.color && "bg-base-300",
              )}
              onClick={() => editingTag !== tag.color && handleTagClick(tag)}
            >
              <span
                className={clsx(
                  "size-3 min-w-3 rounded-full flex-shrink-0",
                  TAG_COLOR_CLASSES[tag.color].dot,
                )}
              />
              {editingTag === tag.color ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-xs bg-base-300 rounded px-1 outline-none"
                  autoFocus
                />
              ) : (
                <>
                  <span className="truncate flex-1 text-left">{tag.name}</span>
                  <span className="text-gray-500 text-[10px] flex-shrink-0">
                    {tag.files.length}
                  </span>
                  <PencilIcon
                    className="size-3 flex-shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100"
                    onClick={(e) => handleStartEdit(e, tag)}
                  />
                </>
              )}
            </div>
            {/* Expanded file list */}
            {expandedTag === tag.color && tag.files.length > 0 && editingTag !== tag.color && (
              <div className="ml-5 flex flex-col gap-0.5 mt-0.5">
                {tag.files.map((fullPath) => {
                  const fileName = fullPath.split("/").pop() || fullPath;
                  const isDir = !fileName.includes(".");
                  return (
                    <button
                      key={fullPath}
                      className="flex items-center gap-2 hover:bg-base-200 rounded text-[11px] py-0.5 px-2 cursor-pointer group"
                      onClick={() => handleFileClick(fullPath)}
                      title={fullPath}
                    >
                      {isDir ? (
                        <FolderIcon className="size-3 min-w-3 text-blue-500" />
                      ) : (
                        <FileIcon className="size-3 min-w-3 text-green-500" />
                      )}
                      <span className="truncate flex-1 text-left">
                        {fileName}
                      </span>
                      <Trash2Icon
                        className="size-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          tags.removeTagFromFile(fullPath, tag.color);
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
