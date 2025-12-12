import { Dialog } from "@/lib/components/dialog";
import { useTags, TAG_COLORS, TAG_COLOR_CLASSES, type TagColor } from "../hooks/useTags";
import { clsx } from "@/lib/functions/clsx";
import { CheckIcon } from "lucide-react";

interface AssignTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fullPath: string;
  tags: ReturnType<typeof useTags>;
}

export function AssignTagsDialog({
  isOpen,
  onClose,
  fullPath,
  tags,
}: AssignTagsDialogProps) {
  if (!isOpen) return null;

  const fileName = fullPath.split("/").pop() || fullPath;
  const currentTags = tags.getFileTags(fullPath);

  const handleToggleTag = (color: TagColor) => {
    tags.toggleTagOnFile(fullPath, color);
  };

  return (
    <Dialog title={`Assign Tags to "${fileName}"`} onClose={onClose}>
      <div className="flex flex-col gap-2 min-w-[300px]">
        <p className="text-sm text-gray-500 mb-2">
          Select tags to assign to this item:
        </p>
        <div className="flex flex-col gap-1">
          {TAG_COLORS.map((color) => {
            const isSelected = currentTags.includes(color);
            const colorClasses = TAG_COLOR_CLASSES[color];
            const tagName = tags.getTagName(color);

            return (
              <button
                key={color}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-base-200",
                  isSelected && colorClasses.bg,
                )}
                onClick={() => handleToggleTag(color)}
              >
                <span
                  className={clsx(
                    "size-4 rounded-full",
                    colorClasses.dot,
                  )}
                />
                <span
                  className={clsx(
                    "flex-1 text-left",
                    isSelected && colorClasses.text,
                  )}
                >
                  {tagName}
                </span>
                {isSelected && (
                  <CheckIcon className={clsx("size-4", colorClasses.text)} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn btn-sm btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}
