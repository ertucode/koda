import { DirectoryId } from '@/features/file-browser/directoryStore/DirectoryBase'

export namespace TableItemFinder {
  export const ListAttr = 'data-list-id'
  export const ItemAttr = 'data-list-item'
  export function findItem(directoryId: DirectoryId, index: number) {
    const tbody = findContainer(directoryId)
    if (!tbody) return

    const row = tbody.querySelector(`[${ItemAttr}]:nth-child(${index + 1})`) as HTMLElement | null

    if (!row) {
      console.warn(`Row at index ${index} not found in table "${directoryId}"`)
      return
    }

    return { tbody, row }
  }

  export function findContainer(directoryId: DirectoryId) {
    const container = document.querySelector(`[${ListAttr}="${directoryId}"]`) as HTMLElement | null
    if (!container) {
      console.warn(`Container with id "${directoryId}" not found`)
      return
    }
    return container
  }
}
