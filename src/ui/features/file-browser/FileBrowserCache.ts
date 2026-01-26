import { getWindowElectron, homeDirectory } from '@/getWindowElectron'
import { mergeMaybeSlashed } from '@common/merge-maybe-slashed'
import { PathHelpers } from '@common/PathHelpers'
import { CachedWorker } from '@common/CachedWorker'
import { directorySizeCache } from './directorySizeCache'

export const FileBrowserCache = new CachedWorker(
  (dir: string) => getWindowElectron().getFilesAndFoldersInDirectory(dir),
  (result, dir) => {
    if (result.success) {
      for (const i of result.data) {
        i.fullPath = PathHelpers.revertExpandedHome(homeDirectory, mergeMaybeSlashed(dir, i.name))

        // Apply cached directory sizes
        if (i.type === 'dir' && i.fullPath) {
          const cachedSize = directorySizeCache.get(i.fullPath, i.modifiedTimestamp)
          if (cachedSize) {
            i.size = cachedSize.size
            i.sizeStr = cachedSize.sizeStr
          }
        }
      }
    }
    return result
  },
  1000
)
