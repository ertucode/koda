import { useSelector } from '@xstate/store/react'
import { directoryStore } from '../directoryStore/directory'
import { DirectoryContextProvider } from '../DirectoryContext'
import { FolderBreadcrumb } from './FolderBreadcrumb'
import { FileBrowserOptionsSection } from './FileBrowserOptionsSection'

export function BottomToolbar() {
  const activeDirectoryId = useSelector(directoryStore, s => s.context.activeDirectoryId)

  if (!activeDirectoryId) {
    return (
      <div className="h-10 bg-base-100 border-t border-base-300 flex items-center px-4">
        <div className="text-sm text-gray-500">No directory selected</div>
      </div>
    )
  }

  return (
    <div id="bottom-toolbar" className="h-10 bg-base-100 border-t border-base-300 flex items-center px-4">
      <DirectoryContextProvider directoryId={activeDirectoryId}>
        <div className="join flex-1 overflow-x-auto">
          <FolderBreadcrumb />
        </div>
      </DirectoryContextProvider>
      <div className="ml-auto flex items-center gap-2">
        <VimStatus />
        <FileBrowserOptionsSection />
      </div>
    </div>
  )
}

function VimStatus() {
  const cursor = useSelector(directoryStore, s => {
    const id = s.context.activeDirectoryId
    if (!id) return undefined
    const d = s.context.directoriesById[id]
    if (!d) return undefined
    if (d.directory.type !== 'path') return undefined
    const fullPath = d.directory.fullPath
    if (!fullPath) return undefined
    return s.context.vim.buffers[fullPath]?.cursor
  })

  if (!cursor) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">
        {cursor.line + 1}:{cursor.column + 1}
      </span>
    </div>
  )
}
