import { HistoryStack } from '@common/history-stack'
import { TagColor } from '../tags'
import { SortState } from '../schemas'
import { GenericError } from '@common/GenericError'
import { VimEngine } from '@common/VimEngine'
import { GetFilesAndFoldersInDirectoryItem } from '@common/Contracts'

export type DirectoryInfo = { type: 'path'; fullPath: string } | { type: 'tags'; color: TagColor }
export type DirectoryType = DirectoryInfo['type']

export function directoryInfoEquals(a: DirectoryInfo, b: DirectoryInfo): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'path' && b.type === 'path') return a.fullPath === b.fullPath
  if (a.type === 'tags' && b.type === 'tags') return a.color === b.color
  return false
}
export function getActiveDirectory(context: DirectoryContext, directoryId: DirectoryId | undefined) {
  const dirId = directoryId ?? context.activeDirectoryId
  return context.directoriesById[dirId]
}

export function mapToDirectoryItems(items: GetFilesAndFoldersInDirectoryItem[]): DirectoryItem[] {
  return items.map(i => ({ type: 'real', item: i, str: i.name }))
}

export type DirectoryId = $Branded<string, 'DirectoryId'>
export type DirectoryItem = VimEngine.BufferItem
export type NotModifiedDirectoryItem = Extract<DirectoryItem, { type: 'real' }>

export type DirectoryLocalSort = {
  actual: SortState
  basedOn: SortState | undefined
}

export type DirectoryContextDirectory = {
  directoryId: DirectoryId
  directory: DirectoryInfo
  loading: boolean
  directoryData: DirectoryItem[]
  error: GenericError | undefined
  historyStack: HistoryStack<DirectoryInfo>
  pendingSelection: string | string[] | null
  selection: {
    indexes: Set<number>
    last: number | undefined
  }
  fuzzyQuery: string
  viewMode: 'list' | 'grid'
  localSort: DirectoryLocalSort | undefined
}

export type DirectoryContext = {
  directoriesById: { [id: DirectoryId]: DirectoryContextDirectory }
  directoryOrder: DirectoryId[]
  activeDirectoryId: DirectoryId
  vim: VimEngine.State
}
