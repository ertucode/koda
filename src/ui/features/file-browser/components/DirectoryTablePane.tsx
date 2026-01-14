import { useSelector } from '@xstate/store/react'
import { DirectoryContextProvider } from '../DirectoryContext'
import { DirectoryId } from '../directoryStore/DirectoryBase'
import { FileBrowserTable } from '../FileBrowserTable'
import { FuzzyInput } from './FuzzyInput'
import { fileDragDropStore } from '../fileDragDrop'
import { DragRectangle } from './DragRectangle'

export function DirectoryTablePane({ directoryId }: { directoryId: DirectoryId }) {
  return (
    <div className="relative flex flex-col min-h-0 min-w-0 h-full overflow-hidden">
      <DragOverlay directoryId={directoryId} />
      <FuzzyInput directoryId={directoryId} />
      <DirectoryContextProvider directoryId={directoryId}>
        <FileBrowserTable />
      </DirectoryContextProvider>
      <DragRectangle directoryId={directoryId} />
    </div>
  )
}

function DragOverlay({ directoryId }: { directoryId: DirectoryId }) {
  const isDragOver = useSelector(
    fileDragDropStore,
    s => s.context.dragOverDirectoryId === directoryId && s.context.dragOverRowIdx == null
  )
  if (!isDragOver) return null

  return (
    <div className="absolute inset-0 pointer-events-none border border-blue-500/70 bg-blue-500/5 z-50 border-dashed border-3"></div>
  )
}
