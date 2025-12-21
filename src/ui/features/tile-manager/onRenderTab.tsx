import { clsx } from "@/lib/functions/clsx";
import {
  TabNode,
  ITabRenderValues,
  TabSetNode,
  Actions,
} from "flexlayout-react";
import {
  FoldersIcon,
  HeartIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
  XIcon,
  LoaderIcon,
} from "lucide-react";
import { layoutModel } from "../file-browser/initializeDirectory";
import { useSelector } from "@xstate/store/react";
import {
  DirectoryId,
  directoryStore,
  selectDirectory,
} from "../file-browser/directory";
import { useDirectoryLoading } from "../file-browser/directoryLoadingStore";
import { TAG_COLOR_CLASSES } from "../file-browser/tags";

export const onRenderTab = (node: TabNode, renderValues: ITabRenderValues) => {
  const component = node.getComponent();
  const config = node.getConfig();

  // Check if this tab is selected - getSelected() returns index, need to get selected tab
  const parent = node.getParent();
  let isSelected = false;
  let parentIsActive = false;
  if (parent && parent instanceof TabSetNode) {
    parentIsActive = parent.isActive();
    const selectedIndex = parent.getSelected();
    const children = parent.getChildren();
    if (selectedIndex >= 0 && selectedIndex < children.length) {
      isSelected = children[selectedIndex] === node;
    }
  }

  // Get icon based on component type
  let Icon = FoldersIcon;
  if (component === "favorites") Icon = HeartIcon;
  else if (component === "recents") Icon = ClockIcon;
  else if (component === "tags") Icon = TagIcon;
  else if (component === "preview") Icon = EyeIcon;

  const isDirectory = component === "directory" && config?.directoryId;
  const noSiblings = node?.getParent()?.getChildren()?.length === 1;

  // Use your actual Button component with join-item styling
  renderValues.content = isDirectory ? (
    <div
      className={clsx(
        "join-item cursor-move flex items-center gap-3 h-full p-2",
        isSelected && "shadow-[inset_0_-3px_0_0_var(--color-primary)]",
        (!parentIsActive || !isSelected) && "opacity-60",
        "dir-marker",
      )}
    >
      <DirectoryIcon directoryId={config.directoryId} />
      <DirectoryTabLabel directoryId={config.directoryId} />
      <div
        key={`close-${node.getId()}`}
        className="join-item cursor-pointer flex items-center gap-3 h-full"
        title="Close"
        onClick={(e) => {
          e.stopPropagation();
          layoutModel.doAction(Actions.deleteTab(node.getId()));
        }}
      >
        <XIcon className="size-4" />
      </div>
    </div>
  ) : (
    <div
      className={clsx(
        "join-item cursor-move flex items-center gap-2 p-1 pl-2 h-full text-xs",
        node.isSelected() &&
          !noSiblings &&
          "shadow-[inset_0_-3px_0_0_var(--color-primary)]",
        !noSiblings && "px-2",
      )}
    >
      <Icon className="size-4" />
      {noSiblings && node.getName()}
    </div>
  );

  // Customize close button with our Button component
  if (node.isEnableClose()) {
    renderValues.buttons = [
      // <Button
      //   key={`close-${node.getId()}`}
      //   icon={XIcon}
      //   className="btn-ghost btn-sm btn-square join-item rounded-none"
      //   title="Close"
      //   onClick={(e) => {
      //     e.stopPropagation();
      //     layoutModel.doAction(Actions.deleteTab(node.getId()));
      //   }}
      // />,
    ];
  }
};

function DirectoryIcon({ directoryId }: { directoryId: DirectoryId }) {
  const isLoading = useDirectoryLoading(directoryId);
  return isLoading ? (
    <LoaderIcon className="size-4 animate-spin" />
  ) : (
    <FoldersIcon className="size-4" />
  );
}
function DirectoryTabLabel({ directoryId }: { directoryId: DirectoryId }) {
  const directory = useSelector(directoryStore, selectDirectory(directoryId));

  if (directory.type !== "path")
    return (
      <div
        className={clsx(
          "size-3 min-w-3 rounded-full flex-shrink-0",
          TAG_COLOR_CLASSES[directory.color].dot,
        )}
      />
    );

  return (
    <>
      <span className="text-xs truncate max-w-[200px]">
        {directory.fullPath}
      </span>
    </>
  );
}
