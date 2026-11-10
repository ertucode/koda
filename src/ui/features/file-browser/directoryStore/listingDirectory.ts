import { homeDirectory } from '@/getWindowElectron'
import { PathHelpers } from '@common/PathHelpers'
import { recentsStore } from '../recents'
import { tagsStore } from '../tags'
import { DirectoryInfo, DirectoryViewMode, ListingDirectoryInfo } from './DirectoryBase'

type ListingDirectorySource = {
  defaultViewMode: DirectoryViewMode
  getKey: (directory: ListingDirectoryInfo) => string
  getPaths: (directory: ListingDirectoryInfo) => string[]
  removeStalePaths: (paths: string[]) => void
}

const listingDirectorySources = {
  tags: {
    defaultViewMode: 'list',
    getKey: directory => `tag:${directory.type === 'tags' ? directory.color : ''}`,
    getPaths: directory => {
      if (directory.type !== 'tags') return []
      return Object.entries(tagsStore.get().context.fileTags)
        .filter(([, tags]) => tags.includes(directory.color))
        .map(([path]) => path)
    },
    removeStalePaths: paths => {
      if (paths.length > 0) tagsStore.trigger.removeFilesFromAllTags({ fullPaths: paths })
    },
  },
  recents: {
    defaultViewMode: 'grid',
    getKey: () => 'recents',
    getPaths: () => recentsStore.get().context.recents.map(recent => recent.fullPath),
    removeStalePaths: paths => {
      paths.forEach(fullPath => recentsStore.send({ type: 'removeRecent', fullPath }))
    },
  },
} satisfies Record<ListingDirectoryInfo['type'], ListingDirectorySource>

function getListingDirectorySource(directory: ListingDirectoryInfo): ListingDirectorySource {
  return listingDirectorySources[directory.type]
}

export function getListingDirectoryKey(directory: ListingDirectoryInfo): string {
  return getListingDirectorySource(directory).getKey(directory)
}

export function getListingDirectoryPaths(directory: ListingDirectoryInfo): string[] {
  return getListingDirectorySource(directory).getPaths(directory)
}

export function removeStaleListingPaths(directory: ListingDirectoryInfo, existingPaths: string[]): void {
  const existing = new Set(existingPaths.map(path => PathHelpers.expandHome(homeDirectory, path)))
  const stalePaths = getListingDirectoryPaths(directory).filter(
    path => !existing.has(PathHelpers.expandHome(homeDirectory, path))
  )

  getListingDirectorySource(directory).removeStalePaths(stalePaths)
}

export function getDefaultListingViewMode(directory: ListingDirectoryInfo): DirectoryViewMode {
  return getListingDirectorySource(directory).defaultViewMode
}

export function getInitialDirectoryViewMode(directory: DirectoryInfo): DirectoryViewMode {
  return directory.type === 'path' ? 'list' : getDefaultListingViewMode(directory)
}

export function getViewModeAfterNavigation(
  directory: DirectoryInfo,
  currentViewMode: DirectoryViewMode
): DirectoryViewMode {
  return directory.type === 'recents' ? getDefaultListingViewMode(directory) : currentViewMode
}
