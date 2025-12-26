import { getWindowElectron } from "@/getWindowElectron";
import { taskStore } from "./taskStore";
import { directoryStore } from "./file-browser/directoryStore/directory";
import { directoryHelpers } from "./file-browser/directoryStore/directoryHelpers";
import { PathHelpers } from "@common/PathHelpers";

const home = getWindowElectron().homeDirectory;

export function subscribeToTasks() {
  getWindowElectron().onTaskEvent((event) => {
    if (event.type === "result") {
      const tasks = taskStore.getSnapshot().context.tasks;
      const task = tasks[event.id];
      if (!task) return;

      if (task.type === "archive" || task.type === "unarchive") {
        const destination = task.metadata.destination;
        const start = new Date(task.createdIso);
        const elapsed = new Date().getTime() - start.getTime();
        const fileToSelect =
          elapsed < 1000 ? PathHelpers.getLastPathPart(destination) : undefined;
        return checkAndReloadDirectories(
          PathHelpers.getParentFolder(
            PathHelpers.expandHome(
              getWindowElectron().homeDirectory,
              destination,
            ),
          ).path,
          fileToSelect,
        );
      }
    }
  });

  function checkAndReloadDirectories(
    path: string,
    fileToSelect: string | undefined,
  ) {
    const directories = directoryStore.getSnapshot().context.directoriesById;

    for (const dir of Object.values(directories)) {
      if (dir.directory.type === "tags") continue;

      if (PathHelpers.expandHome(home, dir.directory.fullPath) === path) {
        directoryHelpers.reload(dir.directoryId);
        if (fileToSelect) {
          directoryHelpers.setPendingSelection(fileToSelect, dir.directoryId);
        }

        return;
      }
    }
  }
}
