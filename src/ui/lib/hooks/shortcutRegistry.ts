import { DefinedShortcutInput, ShortcutCode, isSequenceShortcut } from './useShortcuts'
import { shortcutCustomizationStore } from './shortcutCustomization'

export type RegisteredCommand = {
  command: string
  label: string
  handler: (event: KeyboardEvent | undefined) => void
  shortcut?: DefinedShortcutInput
  defaultShortcut?: DefinedShortcutInput
}

const commandRegistry = new Map<string, RegisteredCommand>()

function shortcutFromCustom(
  registered: RegisteredCommand,
  custom: ShortcutCode | ShortcutCode[] | { sequence: string[] }
): DefinedShortcutInput {
  if (typeof custom === 'object' && !Array.isArray(custom) && 'sequence' in custom) {
    return {
      command: registered.command,
      sequence: custom.sequence,
      handler: registered.handler,
      label: registered.label,
    }
  }

  return {
    command: registered.command,
    code: custom,
    handler: registered.handler,
    label: registered.label,
  }
}

export const shortcutRegistryAPI = {
  register: (
    command: string,
    label: string,
    handler: (event: KeyboardEvent | undefined) => void,
    shortcut?: DefinedShortcutInput
  ) => {
    commandRegistry.set(command, {
      command,
      label,
      handler,
      shortcut,
      defaultShortcut: shortcut,
    })
  },

  unregister: (command: string) => {
    commandRegistry.delete(command)
  },

  getAll: (): RegisteredCommand[] => {
    const customShortcuts = shortcutCustomizationStore.get().context.customShortcuts

    return Array.from(commandRegistry.values()).map(registered => {
      const customKey = customShortcuts[registered.command]
      if (!customKey) return registered

      if (!registered.shortcut) {
        return { ...registered, shortcut: shortcutFromCustom(registered, customKey) }
      }

      const customizedShortcut = { ...registered.shortcut }
      if (isSequenceShortcut(customizedShortcut)) {
        if (typeof customKey === 'object' && !Array.isArray(customKey) && 'sequence' in customKey) {
          customizedShortcut.sequence = customKey.sequence
        }
      } else {
        customizedShortcut.code = customKey as ShortcutCode | ShortcutCode[]
      }

      return { ...registered, shortcut: customizedShortcut }
    })
  },

  clear: () => {
    commandRegistry.clear()
  },
}
