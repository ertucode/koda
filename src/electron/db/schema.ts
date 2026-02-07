import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const openedApplications = sqliteTable(
  "openedApplications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    extension: text("extension").notNull(),
    appPath: text("appPath").notNull(),
    appName: text("appName").notNull(),
    lastOpenedAt: integer("lastOpenedAt").notNull(),
    isDefault: integer("isDefault", { mode: "boolean" }).notNull().default(false),
  },
);
