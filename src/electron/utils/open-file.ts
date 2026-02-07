import { exec } from "child_process";
import { platform } from "os";
import { expandHome } from "./expand-home.js";
import { ShellHelpers } from "./ShellHelpers.js";
import { getDefaultApplicationForExtension, getExtensionFromPath } from "../db/openedApplications.js";
import { openFileWithApplication } from "./get-applications-for-file.js";

export async function openFile(path: string) {
  const expandedPath = expandHome(path);
  const extension = getExtensionFromPath(expandedPath);
  if (extension) {
    try {
      const defaultApplication = getDefaultApplicationForExtension(extension);
      if (defaultApplication) {
        await openFileWithApplication(expandedPath, defaultApplication.appPath);
        return;
      }
    } catch {}
  }

  const cmd = getCommand(expandedPath);

  if (!cmd) return Promise.reject(new Error("Unsupported platform"));

  return new Promise<void>((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getCommand(path: string) {
  const p = platform();

  if (p === "darwin") return `open ${ShellHelpers.escape(path)}`;
  if (p === "win32") return `start "" ${ShellHelpers.escape(path)}`;
  if (p === "linux") return `xdg-open ${ShellHelpers.escape(path)}`;

  return "";
}
