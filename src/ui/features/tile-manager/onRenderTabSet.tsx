import { Button } from "@/lib/components/button";
import {
  TabSetNode,
  BorderNode,
  ITabSetRenderValues,
  TabNode,
  Actions,
} from "flexlayout-react";
import { PlusIcon, Maximize2Icon } from "lucide-react";
import { directoryStore } from "../file-browser/directory";
import { layoutModel } from "../file-browser/initializeDirectory";

export const onRenderTabSet = (
  tabSetNode: TabSetNode | BorderNode,
  renderValues: ITabSetRenderValues,
) => {
  renderValues.buttons = [];
  // Only add button for TabSetNode, not BorderNode
  if (tabSetNode instanceof TabSetNode) {
    const children = tabSetNode.getChildren();

    // Check if this is the directory tabset
    const isDirectoryTabSet = children.some((child) => {
      if (child instanceof TabNode) {
        return child.getComponent() === "directory";
      }
      return false;
    });

    if (isDirectoryTabSet) {
      renderValues.buttons.push(
        <Button
          key="add-directory"
          icon={PlusIcon}
          className="btn-ghost btn-sm btn-square rounded-none directory-tabset-marker"
          title="Add New Directory"
          onClick={() => {
            directoryStore.trigger.createDirectory({
              tabId: tabSetNode.getId(),
            });
          }}
        />,
      );

      renderValues.buttons.push(
        <Button
          key="maximize-thing"
          icon={Maximize2Icon}
          className="btn-ghost btn-sm btn-square rounded-none"
          title="Maximize Thing"
          onClick={() => {
            layoutModel.doAction(Actions.maximizeToggle(tabSetNode.getId()));
          }}
        />,
      );
    }
  }
};
