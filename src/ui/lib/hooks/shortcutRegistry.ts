// Global registry for all active shortcuts
// Uses a Map with labels as keys to store shortcuts

import { DefinedShortcutInput } from "./useShortcuts";

export type RegisteredShortcut = {
  label: string;
  shortcut: DefinedShortcutInput;
};

const shortcutRegistry = new Map<string, RegisteredShortcut>();

export const shortcutRegistryAPI = {
  register: (label: string, shortcut: DefinedShortcutInput) => {
    shortcutRegistry.set(label, { label, shortcut });
  },

  unregister: (label: string) => {
    shortcutRegistry.delete(label);
  },

  getAll: () => {
    return Array.from(shortcutRegistry.values());
  },

  clear: () => {
    shortcutRegistry.clear();
  },
};
