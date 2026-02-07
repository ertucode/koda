import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index.js";
import { openedApplications } from "./schema.js";

export type OpenedApplication = {
  extension: string;
  appPath: string;
  appName: string;
  lastOpenedAt: number;
  isDefault: boolean;
};

export function getExtensionFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return normalizeExtension(ext);
}

export function normalizeExtension(extension: string) {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
}

export function getOpenedApplicationsForExtension(extension: string): OpenedApplication[] {
  const normalized = normalizeExtension(extension);
  if (!normalized) return [];

  const db = getDb();
  return db
    .select({
      extension: openedApplications.extension,
      appPath: openedApplications.appPath,
      appName: openedApplications.appName,
      lastOpenedAt: openedApplications.lastOpenedAt,
      isDefault: openedApplications.isDefault,
    })
    .from(openedApplications)
    .where(eq(openedApplications.extension, normalized))
    .orderBy(desc(openedApplications.lastOpenedAt))
    .all();
}

export function getDefaultApplicationForExtension(extension: string): OpenedApplication | undefined {
  const normalized = normalizeExtension(extension);
  if (!normalized) return undefined;

  const db = getDb();
  return db
    .select({
      extension: openedApplications.extension,
      appPath: openedApplications.appPath,
      appName: openedApplications.appName,
      lastOpenedAt: openedApplications.lastOpenedAt,
      isDefault: openedApplications.isDefault,
    })
    .from(openedApplications)
    .where(and(eq(openedApplications.extension, normalized), eq(openedApplications.isDefault, true)))
    .limit(1)
    .all()[0];
}

export function recordOpenedApplication(extension: string, appPath: string, appName?: string) {
  const normalized = normalizeExtension(extension);
  if (!normalized || !appPath) return;

  const db = getDb();
  const now = Date.now();
  const resolvedName = resolveAppName(appName, appPath);
  const existing = db
    .select({ id: openedApplications.id })
    .from(openedApplications)
    .where(and(eq(openedApplications.extension, normalized), eq(openedApplications.appPath, appPath)))
    .limit(1)
    .all()[0];

  if (existing) {
    db
      .update(openedApplications)
      .set({
        appName: resolvedName,
        lastOpenedAt: now,
      })
      .where(eq(openedApplications.id, existing.id))
      .run();
    return;
  }

  db
    .insert(openedApplications)
    .values({
      extension: normalized,
      appPath,
      appName: resolvedName,
      lastOpenedAt: now,
      isDefault: false,
    })
    .run();
}

export function recordOpenedApplicationForFile(filePath: string, appPath: string, appName?: string) {
  const extension = getExtensionFromPath(filePath);
  if (!extension) return;
  recordOpenedApplication(extension, appPath, appName);
}

export function setDefaultApplicationForExtension(extension: string, appPath: string, appName?: string) {
  const normalized = normalizeExtension(extension);
  if (!normalized || !appPath) return;

  const db = getDb();
  const now = Date.now();
  const resolvedName = resolveAppName(appName, appPath);
  db.transaction(() => {
    db
      .update(openedApplications)
      .set({ isDefault: false })
      .where(eq(openedApplications.extension, normalized))
      .run();

    const existing = db
      .select({ id: openedApplications.id })
      .from(openedApplications)
      .where(and(eq(openedApplications.extension, normalized), eq(openedApplications.appPath, appPath)))
      .limit(1)
      .all()[0];

    if (existing) {
      db
        .update(openedApplications)
        .set({
          appName: resolvedName,
          lastOpenedAt: now,
          isDefault: true,
        })
        .where(eq(openedApplications.id, existing.id))
        .run();
      return;
    }

    db
      .insert(openedApplications)
      .values({
        extension: normalized,
        appPath,
        appName: resolvedName,
        lastOpenedAt: now,
        isDefault: true,
      })
      .run();
  });
}

export function clearDefaultApplicationForExtension(extension: string) {
  const normalized = normalizeExtension(extension);
  if (!normalized) return;

  const db = getDb();
  db
    .update(openedApplications)
    .set({ isDefault: false })
    .where(eq(openedApplications.extension, normalized))
    .run();
}

function resolveAppName(appName: string | undefined, appPath: string) {
  const trimmed = appName?.trim();
  if (trimmed) return trimmed;

  const baseName = path.basename(appPath);
  if (baseName.endsWith(".app")) {
    return baseName.slice(0, -4);
  }

  if (baseName.toLowerCase().endsWith(".exe")) {
    return baseName.slice(0, -4);
  }

  return baseName || appPath;
}
