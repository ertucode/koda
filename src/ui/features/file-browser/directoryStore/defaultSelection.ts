import { DirectoryContext, DirectoryContextDirectory, getFullPathForSelection } from './DirectoryBase'

export const defaultSelection = Object.freeze({ indexes: new Set<number>(), last: undefined })
export function getBufferSelection(state: DirectoryContext, directory: DirectoryContextDirectory) {
  if (!directory) return defaultSelection
  const fullPath = getFullPathForSelection(directory.directory)
  return state.vim.buffers[fullPath]?.selection
}

export function getCursorLine(state: DirectoryContext, directory: DirectoryContextDirectory) {
  if (!directory) return 0
  const fullPath = getFullPathForSelection(directory.directory)
  return state.vim.buffers[fullPath]?.cursor.line
}
