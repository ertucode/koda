import { Node, TabNode } from "flexlayout-react";
import { layoutModel } from "../initializeDirectory";
import { DirectoryId } from "../directory";

export namespace LayoutHelpers {
  export function getActiveTabsetThatHasDirectory() {
    const active = layoutModel.getActiveTabset();
    if (!active) return;

    const first = active.getChildren()[0];
    if (!first) return;

    if (first instanceof TabNode && first.getComponent() === "directory")
      return active;

    return undefined;
  }

  export function getActiveDirectoryId() {
    const node = layoutModel.getActiveTabset()?.getSelectedNode();
    if (isDirectory(node) && node.getConfig()?.directoryId) {
      return node.getConfig()?.directoryId as DirectoryId;
    }
    return undefined;
  }

  export function isDirectory(node: Node | undefined): node is TabNode {
    return node instanceof TabNode && node.getComponent() === "directory";
  }

  export function getDirectoryId(node: TabNode) {
    return node.getConfig()?.directoryId;
  }
}
