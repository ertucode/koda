import { exec } from "child_process";
import { platform } from "os";
import { promisify } from "util";
import { expandHome } from "./expand-home.js";

const execAsync = promisify(exec);

export type ApplicationInfo = {
  name: string;
  path: string;
  isDefault?: boolean;
};

export async function getApplicationsForFile(
  filePath: string,
): Promise<ApplicationInfo[]> {
  const expandedPath = expandHome(filePath);
  const p = platform();

  if (p === "darwin") {
    return getMacApplications(expandedPath);
  } else if (p === "linux") {
    return getLinuxApplications(expandedPath);
  } else if (p === "win32") {
    return getWindowsApplications(expandedPath);
  }

  return [];
}

async function getMacApplications(
  filePath: string,
): Promise<ApplicationInfo[]> {
  try {
    // Get default application
    const { stdout: defaultOut } = await execAsync(
      `mdls -name kMDItemContentType -raw "${filePath}"`,
    );
    const contentType = defaultOut.trim();

    let defaultApp: string | undefined;
    if (contentType && contentType !== "(null)") {
      try {
        const { stdout: defaultAppOut } = await execAsync(
          `defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null | grep -A 2 "${contentType}" | grep LSHandlerRoleAll | awk -F'"' '{print $2}' | head -1`,
        );
        defaultApp = defaultAppOut.trim();
      } catch {
        // Ignore errors getting default app
      }
    }

    // Get all applications that can open this file
    // Use mdfind to find apps by content type, or use a list of common apps
    const { stdout } = await execAsync(
      `mdfind "kMDItemContentType == '${contentType}'" 2>/dev/null | grep -i ".app$" | head -20`,
    );

    const apps = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((appPath) => {
        const name = appPath.split("/").pop()?.replace(".app", "") || appPath;
        return {
          name,
          path: appPath,
          isDefault: defaultApp ? appPath.includes(defaultApp) : false,
        };
      });

    // If we didn't find apps via content type, try common applications
    if (apps.length === 0) {
      const ext = filePath.split(".").pop()?.toLowerCase();
      const commonApps = getCommonMacApps(ext);

      // Check which of these apps actually exist
      for (const app of commonApps) {
        try {
          await execAsync(`test -d "${app.path}"`);
          apps.push({
            name: app.name,
            path: app.path,
            isDefault: app.isDefault ?? false,
          });
        } catch {
          // App doesn't exist, skip it
        }
      }
    }

    // Always add "Browse..." option to let user pick any application
    apps.push({
      name: "Browse...",
      path: "__choose__",
      isDefault: false,
    });

    return apps;
  } catch (error) {
    console.error("Error getting Mac applications:", error);
    return [
      {
        name: "Browse...",
        path: "__choose__",
        isDefault: false,
      },
    ];
  }
}

function getCommonMacApps(ext?: string): ApplicationInfo[] {
  const apps: ApplicationInfo[] = [];

  // Text editors
  if (
    ext &&
    [
      "txt",
      "md",
      "js",
      "ts",
      "jsx",
      "tsx",
      "json",
      "css",
      "html",
      "xml",
      "yaml",
      "yml",
    ].includes(ext)
  ) {
    apps.push(
      {
        name: "Visual Studio Code",
        path: "/Applications/Visual Studio Code.app",
        isDefault: false,
      },
      {
        name: "Sublime Text",
        path: "/Applications/Sublime Text.app",
        isDefault: false,
      },
      {
        name: "TextEdit",
        path: "/System/Applications/TextEdit.app",
        isDefault: false,
      },
    );
  }

  // Images
  if (
    ext &&
    ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)
  ) {
    apps.push(
      {
        name: "Preview",
        path: "/System/Applications/Preview.app",
        isDefault: false,
      },
      {
        name: "Photoshop",
        path: "/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app",
        isDefault: false,
      },
    );
  }

  // Videos
  if (ext && ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    apps.push(
      {
        name: "QuickTime Player",
        path: "/System/Applications/QuickTime Player.app",
        isDefault: false,
      },
      { name: "VLC", path: "/Applications/VLC.app", isDefault: false },
    );
  }

  // PDFs
  if (ext === "pdf") {
    apps.push(
      {
        name: "Preview",
        path: "/System/Applications/Preview.app",
        isDefault: false,
      },
      {
        name: "Adobe Acrobat",
        path: "/Applications/Adobe Acrobat DC/Adobe Acrobat.app",
        isDefault: false,
      },
    );
  }

  return apps;
}

async function getLinuxApplications(
  filePath: string,
): Promise<ApplicationInfo[]> {
  try {
    // Get MIME type
    const { stdout: mimeOut } = await execAsync(
      `file --mime-type -b "${filePath}"`,
    );
    const mimeType = mimeOut.trim();

    // Get desktop files that can handle this MIME type
    const { stdout } = await execAsync(
      `grep -r "MimeType=.*${mimeType}" /usr/share/applications ~/.local/share/applications 2>/dev/null | cut -d: -f1 | head -20`,
    );

    const apps: ApplicationInfo[] = [];
    const desktopFiles = stdout.split("\n").filter((line) => line.trim());

    for (const desktopFile of desktopFiles) {
      try {
        const { stdout: nameOut } = await execAsync(
          `grep "^Name=" "${desktopFile}" | head -1 | cut -d= -f2`,
        );
        const name = nameOut.trim();
        if (name) {
          apps.push({
            name,
            path: desktopFile,
          });
        }
      } catch {
        // Skip this app
      }
    }

    apps.push({
      name: "Browse...",
      path: "__choose__",
      isDefault: false,
    });

    return apps;
  } catch (error) {
    console.error("Error getting Linux applications:", error);
    return [
      {
        name: "Browse...",
        path: "__choose__",
        isDefault: false,
      },
    ];
  }
}

async function getWindowsApplications(
  filePath: string,
): Promise<ApplicationInfo[]> {
  try {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (!ext) {
      return [
        {
          name: "Browse...",
          path: "__choose__",
          isDefault: false,
        },
      ];
    }

    // Get associated programs from registry
    const { stdout } = await execAsync(
      `assoc .${ext} 2>nul && ftype $(assoc .${ext} 2>nul | cut -d= -f2) 2>nul`,
    );

    const apps: ApplicationInfo[] = [];

    // Parse the output to extract program paths
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.includes("=")) {
        const match = line.match(/"([^"]+)"/);
        if (match) {
          const appPath = match[1];
          const name =
            appPath.split("\\").pop()?.replace(".exe", "") || appPath;
          apps.push({
            name,
            path: appPath,
            isDefault: true,
          });
        }
      }
    }

    apps.push({
      name: "Browse...",
      path: "__choose__",
      isDefault: false,
    });

    return apps;
  } catch (error) {
    console.error("Error getting Windows applications:", error);
    return [
      {
        name: "Browse...",
        path: "__choose__",
        isDefault: false,
      },
    ];
  }
}

export async function openFileWithApplication(
  filePath: string,
  applicationPath: string,
): Promise<void> {
  const expandedPath = expandHome(filePath);
  const p = platform();

  let cmd: string;
  if (p === "darwin") {
    cmd = `open -a "${applicationPath}" "${expandedPath}"`;
  } else if (p === "linux") {
    // For .desktop files, extract the Exec command
    try {
      const { stdout } = await execAsync(
        `grep "^Exec=" "${applicationPath}" | head -1 | cut -d= -f2`,
      );
      const execCmd = stdout.trim().replace(/%[a-zA-Z]/g, ""); // Remove %f, %u, etc.
      cmd = `${execCmd} "${expandedPath}"`;
    } catch {
      cmd = `xdg-open "${expandedPath}"`;
    }
  } else if (p === "win32") {
    cmd = `start "" "${applicationPath}" "${expandedPath}"`;
  } else {
    throw new Error("Unsupported platform");
  }

  await execAsync(cmd);
}
