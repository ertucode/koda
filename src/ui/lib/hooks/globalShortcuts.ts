import {
  CompiledSequences,
  CompiledShortcuts,
  compileSequences,
  compileShortcuts,
  handleKeydown,
} from './shortcutCompilation'
import { shortcutRegistryAPI } from './shortcutRegistry'
import { SequenceShortcut, ShortcutCode, ShortcutWithHandler } from './useShortcuts'

export type CommandDefinition = {
  command: string
  label: string
  customizable?: boolean
}

export type ShortcutCommand = CommandDefinition & {
  code: ShortcutCode | ShortcutCode[]
  handler: (e: KeyboardEvent | undefined) => void
  enabledIn?: React.RefObject<HTMLElement | null> | ((e: KeyboardEvent | undefined) => boolean)
  notCode?: ShortcutCode | ShortcutCode[]
}

export type SequenceCommand = CommandDefinition & {
  sequence: string[]
  handler: (e: KeyboardEvent | undefined) => void
  timeout?: number
  enabledIn?: React.RefObject<HTMLElement | null> | ((e: KeyboardEvent) => boolean)
}

export namespace GlobalShortcuts {
  export type Create = {
    key: string
    shortcuts: ShortcutCommand[]
    enabled: boolean
    sequences: SequenceCommand[]
  }

  type Item = {
    shortcuts: CompiledShortcuts
    sequences: CompiledSequences
    enabled: boolean
    key: string
  }

  type FlattenedGlobalShortcuts = {
    shortcuts: CompiledShortcuts
    sequences: CompiledSequences
  }

  const shortcutsMap: Record<string, Item> = {}
  const flattened: FlattenedGlobalShortcuts = {
    shortcuts: new Map(),
    sequences: [],
  }

  function convertShortcutCommand(item: ShortcutCommand): ShortcutWithHandler {
    return {
      command: item.command,
      code: item.code,
      handler: item.handler,
      label: item.label,
      enabledIn: item.enabledIn,
      notCode: item.notCode,
    }
  }

  function convertSequenceCommand(item: SequenceCommand): SequenceShortcut {
    return {
      command: item.command,
      sequence: item.sequence,
      handler: item.handler,
      label: item.label,
      timeout: item.timeout,
      enabledIn: item.enabledIn,
    }
  }

  function recreateFlattened() {
    flattened.shortcuts = new Map()
    flattened.sequences = []

    for (const item of Object.values(shortcutsMap)) {
      if (item.enabled) {
        item.shortcuts.forEach((item, k) => flattened.shortcuts.set(k, item))
        flattened.sequences.push(...item.sequences)
      }
    }
  }

  export function create(item: Create) {
    const convertedShortcuts = item.shortcuts.map(convertShortcutCommand)
    const convertedSequences = item.sequences.map(convertSequenceCommand)

    const compiled = {
      shortcuts: compileShortcuts(convertedShortcuts),
      sequences: compileSequences(convertedSequences),
      enabled: item.enabled,
      key: item.key,
    }
    shortcutsMap[item.key] = compiled

    if (item.enabled) {
      compiled.shortcuts.forEach((item, k) => flattened.shortcuts.set(k, item))
      flattened.sequences.push(...compiled.sequences)
    }

    for (const i of convertedShortcuts) {
      shortcutRegistryAPI.register(i.label, i)
    }

    for (const i of convertedSequences) {
      shortcutRegistryAPI.register(i.label, i)
    }
  }

  export function updateEnabled(key: string, enabled: boolean) {
    const item = shortcutsMap[key]
    if (!item) {
      console.error(`Global shortcut ${key} not found`)
      return
    }

    if (item.enabled === enabled) return
    item.enabled = enabled

    recreateFlattened()
  }

  export function remove(key: string) {
    const item = shortcutsMap[key]
    if (!item) {
      console.error(`Global shortcut ${key} not found`)
      return
    }

    delete shortcutsMap[key]
    recreateFlattened()
  }

  function check(e: KeyboardEvent) {
    handleKeydown(flattened.shortcuts, flattened.sequences, e)
  }

  window.addEventListener('keydown', check)
}
