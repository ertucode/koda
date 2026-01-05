import { VimEngine } from '@common/VimEngine'
import { directoryStore } from './directory'
import { directoryDerivedStores } from './directorySubscriptions'

export function getSnapshotWithInitializedVim() {
  const snapshot = directoryStore.getSnapshot().context
  const activeDirectory = snapshot.directoriesById[snapshot.activeDirectoryId]
  if (!activeDirectory) return
  if (activeDirectory.directory.type !== 'path') return
  const fullPath = activeDirectory.directory.fullPath
  if (!fullPath) return

  const items = directoryDerivedStores.get(activeDirectory.directoryId)!.getFilteredDirectoryData()!
  const wasInitialized = snapshot.vim.buffers[fullPath]
  if (!wasInitialized) {
    snapshot.vim.buffers[fullPath] = VimEngine.defaultBuffer(fullPath, items as VimEngine.RealBufferItem[])
  }
  return {
    snapshot,
    fullPath,
    activeDirectory,
    wasInitialized,
  }
}
