import { PencilIcon } from "lucide-react";
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
    // Show all files with this tag in the main table
    if (tag.files.length > 0) {
      d.showTaggedFiles(tag.color);
    }
  };

  // Check if current view is showing a specific tag
  const isShowingTag = (color: TagColor) => {
    return d.directory.type === "tags" && d.directory.color === color;
  };

  return (
    <div
      className={clsx("flex flex-col gap-1 pr-2 overflow-hidden", className)}
    >
      <h3 className="text-sm font-semibold pl-2 flex-shrink-0">Tags</h3>
      <div className="flex flex-col gap-1 overflow-y-auto min-h-0 flex-1">
        {tagItems.map((tag) => (
          <div key={tag.color}>
            <div
              className={clsx(
                "flex items-center gap-2 hover:bg-base-200 rounded text-xs h-6 px-2 cursor-pointer w-full group",
                isShowingTag(tag.color) && "bg-base-300 font-medium",
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
                  <span className="text-gray-500 text-[10px] flex-shrink-0 w-4 text-right group-hover:hidden">
                    {tag.files.length}
                  </span>
                  <PencilIcon
                    className="size-3 flex-shrink-0 hidden group-hover:block opacity-50 hover:!opacity-100"
                    onClick={(e) => handleStartEdit(e, tag)}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
