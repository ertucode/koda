/**
 * Global utility for scrolling table rows into view without needing refs.
 * Uses data-list-id attribute to identify tables in the DOM.
 */

import { fileDragDropHandlers } from '@/features/file-browser/fileDragDrop'
import { TableItemFinder } from './TableItemFinder'
import { DirectoryId } from '@/features/file-browser/directoryStore/DirectoryBase'

export function scrollRowIntoViewIfNeeded(
  tableId: DirectoryId,
  rowIndex: number,
  block: ScrollLogicalPosition = 'nearest'
) {
  if (fileDragDropHandlers.isDragToSelect()) return
  const found = TableItemFinder.findItem(tableId, rowIndex)
  if (!found) return
  const { tbody, row } = found

  const scrollContainer = tbody.closest('.overflow-auto') as HTMLElement | null

  if (!scrollContainer) {
    console.warn(`Scroll container not found for table "${tableId}"`)
    return
  }

  const containerRect = scrollContainer.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const isInView = rowRect.top >= containerRect.top && rowRect.bottom <= containerRect.bottom

  if (!isInView) {
    row.scrollIntoView({ block })
  }
}
