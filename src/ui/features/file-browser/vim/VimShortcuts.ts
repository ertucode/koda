import { GlobalShortcuts } from '@/lib/hooks/globalShortcuts'
import { VimEngine } from '@common/VimEngine'
import { directoryStore } from '../directoryStore/directory'
import { directoryDerivedStores } from '../directoryStore/directorySubscriptions'

const SHORTCUTS_KEY = 'vim'

function createHandler(updater: (opts: VimEngine.CommandOpts) => VimEngine.State) {
  return (e: KeyboardEvent | undefined) => {
    e?.preventDefault()
    const snapshot = directoryStore.getSnapshot().context
    const activeDirectory = snapshot.directoriesById[snapshot.activeDirectoryId]
    if (!activeDirectory) return
    if (activeDirectory.directory.type !== 'path') return
    const fullPath = activeDirectory.directory.fullPath
    if (!fullPath) return

    const items = directoryDerivedStores.get(activeDirectory.directoryId)!.getFilteredDirectoryData()!
    if (!snapshot.vim.buffers[fullPath]) {
      snapshot.vim.buffers[fullPath] = VimEngine.defaultBuffer(fullPath, items)
    }
    const updated = updater({ state: snapshot.vim, fullPath })
    directoryStore.trigger.updateVimState({ state: updated })
  }
}

export const VimShortcuts = {
  init: () => {
    GlobalShortcuts.create({
      key: SHORTCUTS_KEY,
      enabled: true,
      shortcuts: [
        {
          key: 'u',
          handler: createHandler(VimEngine.u),
          label: '[VIM] Undo',
        },
      ],
      sequences: [
        {
          sequence: ['d', 'd'],
          handler: createHandler(VimEngine.dd),
          label: '[VIM] Delete line',
        },
      ],
    })
  },
  deinit: () => {
    GlobalShortcuts.updateEnabled(SHORTCUTS_KEY, false)
  },
}
