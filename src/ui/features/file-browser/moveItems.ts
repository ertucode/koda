import { GetFilesAndFoldersInDirectoryItem } from '@common/Contracts'
import { GenericError } from '@common/GenericError'
import { PathHelpers } from '@common/PathHelpers'
import { getWindowElectron, homeDirectory } from '@/getWindowElectron'
import { toast } from '@/lib/components/toast'
import { DirectoryId } from './directoryStore/DirectoryBase'
import { directoryHelpers, directoryStore } from './directoryStore/directory'
import { getActiveDirectory } from './directoryStore/directoryPureHelpers'

type MoveOperation = 'move-up' | 'flatten'

function expandedItemPath(item: GetFilesAndFoldersInDirectoryItem, directoryId: DirectoryId) {
  return PathHelpers.expandHome(
    homeDirectory,
    item.fullPath ?? directoryHelpers.getFullPath(item.name, directoryId)
  )
}

export async function startMoveItems(
  items: GetFilesAndFoldersInDirectoryItem[],
  directoryId: DirectoryId,
  operation: MoveOperation,
  depth?: number | 'infinity'
) {
  const activeDirectory = getActiveDirectory(directoryStore.getSnapshot().context, directoryId)
  const sourcePaths = items.map(item => expandedItemPath(item, directoryId))
  const sourcePathSet = new Set(sourcePaths)
  const itemByPath = new Map(sourcePaths.map((sourcePath, index) => [sourcePath, items[index]]))
  const optimisticUpdates: Array<{
    directoryId: DirectoryId
    previousData: GetFilesAndFoldersInDirectoryItem[]
    optimisticData: GetFilesAndFoldersInDirectoryItem[]
  }> = []

  for (const directory of Object.values(directoryStore.getSnapshot().context.directoriesById)) {
    let optimisticData = directory.directoryData.filter(item => {
      if (!item.fullPath && directory.directory.type !== 'path') return true
      const itemPath = PathHelpers.expandHome(
        homeDirectory,
        item.fullPath ?? directoryHelpers.getFullPath(item.name, directory.directoryId)
      )
      return !sourcePathSet.has(itemPath)
    })

    if (operation === 'move-up' && directory.directory.type === 'path') {
      const openPath = PathHelpers.expandHome(homeDirectory, directory.directory.fullPath)
      for (const sourcePath of sourcePaths) {
        const destinationDirectory = PathHelpers.parent(PathHelpers.parent(sourcePath).path).path
        if (openPath !== destinationDirectory) continue
        const sourceItem = itemByPath.get(sourcePath)
        if (!sourceItem) continue
        optimisticData = [
          ...optimisticData,
          {
            ...sourceItem,
            fullPath: `${destinationDirectory}/${sourceItem.name}`.replace(/\/+/g, '/'),
          },
        ]
      }
    }

    if (optimisticData.length === directory.directoryData.length && optimisticData.every((v, i) => v === directory.directoryData[i])) {
      continue
    }
    optimisticUpdates.push({
      directoryId: directory.directoryId,
      previousData: directory.directoryData,
      optimisticData,
    })
    directoryStore.send({ type: 'setDirectoryData', directoryId: directory.directoryId, data: optimisticData })
  }

  const rollback = () => {
    for (const update of optimisticUpdates) {
      const current = directoryStore.getSnapshot().context.directoriesById[update.directoryId]
      if (current?.directoryData !== update.optimisticData) continue
      directoryStore.send({ type: 'setDirectoryData', directoryId: update.directoryId, data: update.previousData })
    }
  }

  try {
    const result = await getWindowElectron().moveItems({
      operation,
      sourcePaths,
      depth,
      clientMetadata: directoryHelpers.getClientMetadata(activeDirectory),
    })
    if (!result.success) {
      rollback()
      toast.show(result)
    }
    return result
  } catch (error) {
    rollback()
    const result = GenericError.Message(error instanceof Error ? error.message : 'Move failed')
    toast.show(result)
    return result
  }
}
