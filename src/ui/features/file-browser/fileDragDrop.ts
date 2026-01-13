import { createStore } from '@xstate/store'
import { GetFilesAndFoldersInDirectoryItem } from '@common/Contracts'
import { directoryHelpers, directoryStore } from './directoryStore/directory'
import { clipboardHelpers } from './clipboardHelpers'
import { getWindowElectron, homeDirectory } from '@/getWindowElectron'
import { toast } from '@/lib/components/toast'
import { DerivedDirectoryItem, DirectoryId, RealDirectoryItem } from './directoryStore/DirectoryBase'
import { useSelector } from '@xstate/store/react'
import { captureDivAsBase64 } from '@/lib/functions/captureDiv'
import { PathHelpers } from '@common/PathHelpers'

// Type for drag items (shared with components)
export type DragItem = {
  fullPath: string
  type: 'file' | 'dir'
  name: string
}

// Type for active in-app drag data
type ActiveDrag = {
  items: DragItem[]
  sourceDirectoryId: DirectoryId
} | null

// Store context for drag and drop state
type FileDragDropContext = {
  dragOverDirectoryId: DirectoryId | null
  dragOverRowIdx: number | null
  isDragToSelect: boolean
  dragToSelectStartIdx: number | null
  dragToSelectDirectoryId: DirectoryId | null
  dragToSelectWithMetaKey: boolean
  dragToSelectStartPosition: { x: number; y: number } | null
  // Track active drag for in-app drops (since native drag doesn't use dataTransfer)
  activeDrag: ActiveDrag
  items: GetFilesAndFoldersInDirectoryItem[] | null
}

// Create the store
export const fileDragDropStore = createStore({
  context: {
    dragOverDirectoryId: null,
    dragOverRowIdx: null,
    isDragToSelect: false,
    dragToSelectStartIdx: null,
    dragToSelectDirectoryId: null,
    dragToSelectWithMetaKey: false,
    dragToSelectStartPosition: null,
    dragToSelectCurrentPosition: null,
    activeDrag: null,
    items: null,
  } as FileDragDropContext,
  on: {
    setDragOverDirectory: (context, event: { directoryId: DirectoryId | null }) => ({
      ...context,
      dragOverDirectoryId: event.directoryId,
    }),
    setDragOverRowIdx: (context, event: { value: number | null }) => ({
      ...context,
      dragOverRowIdx: event.value,
    }),
    startDragToSelect: (
      context,
      event: {
        startIdx: number
        directoryId: DirectoryId
        withMetaKey: boolean
        startPosition: { x: number; y: number }
      }
    ) => ({
      ...context,
      isDragToSelect: true,
      dragToSelectStartIdx: event.startIdx,
      dragToSelectDirectoryId: event.directoryId,
      dragToSelectWithMetaKey: event.withMetaKey,
      dragToSelectStartPosition: event.startPosition,
    }),
    endDragToSelect: context => ({
      ...context,
      isDragToSelect: false,
      dragToSelectStartIdx: null,
      dragToSelectDirectoryId: null,
      dragToSelectWithMetaKey: false,
      dragToSelectStartPosition: null,
    }),
    setActiveDrag: (context, event: { activeDrag: ActiveDrag }) => ({
      ...context,
      activeDrag: event.activeDrag,
    }),
    setDraggedItems: (context, event: { items: GetFilesAndFoldersInDirectoryItem[] | null }) => ({
      ...context,
      items: event.items,
    }),
    reset: () => ({
      dragOverDirectoryId: null,
      dragOverRowIdx: null,
      isDragToSelect: false,
      dragToSelectStartIdx: null,
      dragToSelectDirectoryId: null,
      dragToSelectWithMetaKey: false,
      dragToSelectStartPosition: null,
      activeDrag: null,
      items: null,
    }),
  },
})

// Selectors
export const selectIsDragOverDirectory = (directoryId: DirectoryId) => {
  const state = fileDragDropStore.getSnapshot()
  return state.context.dragOverDirectoryId === directoryId
}

export const selectDragOverRowIdx = () => {
  const state = fileDragDropStore.getSnapshot()
  return state.context.dragOverRowIdx
}

// Helper to check if there's an active file drag (either from dataTransfer or store)
const isFileDrag = (e: React.DragEvent): boolean => {
  // Check if this drag has our custom file drag marker (HTML5 drag)
  if (e.dataTransfer.types.includes('application/x-mygui-file-drag')) {
    return true
  }

  // For native drag, check if we have active drag in store AND the drag contains files
  // (Electron's native drag sets 'Files' type in dataTransfer)
  // This prevents false positives from other drag sources like flexlayout tabs
  const activeDrag = fileDragDropStore.getSnapshot().context.activeDrag
  if (activeDrag !== null && e.dataTransfer.types.includes('Files')) {
    return true
  }

  return false
}

// Auto-scroll state for drag-to-select
let autoScrollState: {
  container: HTMLElement | null
  animationFrameId: number | null
  lastMouseX: number
  lastMouseY: number
} = {
  container: null,
  animationFrameId: null,
  lastMouseX: 0,
  lastMouseY: 0,
}

// Constants for auto-scroll behavior
const AUTO_SCROLL_EDGE_THRESHOLD = 50 // Distance from edge to start scrolling when inside (px)
const AUTO_SCROLL_MAX_SPEED = 40 // Maximum scroll speed (px per frame)
const AUTO_SCROLL_OUTSIDE_MULTIPLIER = 10 // Speed multiplier for distance outside container

// Calculate scroll speed based on distance
// When inside edge zone: closer to edge = faster (0 at threshold, max at edge)
// When outside: speed increases with distance from edge
const calculateScrollSpeed = (distanceFromEdge: number, isOutside: boolean): number => {
  if (!isOutside && distanceFromEdge >= AUTO_SCROLL_EDGE_THRESHOLD) return 0
  const totalDist = isOutside
    ? distanceFromEdge + AUTO_SCROLL_EDGE_THRESHOLD
    : AUTO_SCROLL_EDGE_THRESHOLD - distanceFromEdge
  return Math.min(AUTO_SCROLL_MAX_SPEED, (totalDist / AUTO_SCROLL_EDGE_THRESHOLD) * AUTO_SCROLL_OUTSIDE_MULTIPLIER)
}

// Auto-scroll animation loop
const autoScrollLoop = () => {
  const { container, lastMouseY } = autoScrollState
  if (!container) return

  const rect = container.getBoundingClientRect()
  let scrollDelta = 0

  if (lastMouseY < rect.top) {
    // Mouse is above container - scroll up
    const distanceOutside = rect.top - lastMouseY
    scrollDelta = -calculateScrollSpeed(distanceOutside, true)
  } else if (lastMouseY > rect.bottom) {
    // Mouse is below container - scroll down
    const distanceOutside = lastMouseY - rect.bottom
    scrollDelta = calculateScrollSpeed(distanceOutside, true)
  } else if (lastMouseY < rect.top + AUTO_SCROLL_EDGE_THRESHOLD) {
    // Mouse is near top edge inside container
    const distanceFromEdge = lastMouseY - rect.top
    scrollDelta = -calculateScrollSpeed(distanceFromEdge, false)
  } else if (lastMouseY > rect.bottom - AUTO_SCROLL_EDGE_THRESHOLD) {
    // Mouse is near bottom edge inside container
    const distanceFromEdge = rect.bottom - lastMouseY
    scrollDelta = calculateScrollSpeed(distanceFromEdge, false)
  }

  if (scrollDelta !== 0) {
    container.scrollTop += scrollDelta
    // Update selection after scrolling since visible items changed
    updateSelectionFromMousePosition()
  }

  // Continue the loop while drag-to-select is active
  const dragState = fileDragDropStore.getSnapshot()
  if (dragState.context.isDragToSelect) {
    autoScrollState.animationFrameId = requestAnimationFrame(autoScrollLoop)
  }
}

// Global mouse move handler for auto-scroll during drag-to-select
const handleGlobalMouseMove = (e: MouseEvent) => {
  autoScrollState.lastMouseX = e.clientX
  autoScrollState.lastMouseY = e.clientY

  // Update selection based on mouse position
  updateSelectionFromMousePosition()
}

// Global mouse up handler for drag-to-select
const handleGlobalMouseUp = () => {
  const dragState = fileDragDropStore.getSnapshot()
  if (dragState.context.isDragToSelect) {
    fileDragDropStore.send({ type: 'endDragToSelect' })
    document.body.removeEventListener('mouseup', handleGlobalMouseUp)
    document.body.removeEventListener('mousemove', handleGlobalMouseMove)

    // Stop auto-scroll
    if (autoScrollState.animationFrameId !== null) {
      cancelAnimationFrame(autoScrollState.animationFrameId)
    }
    autoScrollState = {
      container: null,
      animationFrameId: null,
      lastMouseX: 0,
      lastMouseY: 0,
    }
  }
}

// Find the row index at a given Y position within the container
const findRowIndexAtPosition = (container: HTMLElement, mouseY: number, directoryId: DirectoryId): number | null => {
  const listElement =
    container.getAttribute('data-list-id') === directoryId
      ? container
      : container.querySelector(`[data-list-id="${directoryId}"]`)
  if (!listElement) return null

  const items = listElement.querySelectorAll('[data-list-item]')
  if (items.length === 0) return null

  const containerRect = container.getBoundingClientRect()

  // If mouse is above container, return first visible item
  if (mouseY < containerRect.top) {
    // Find the first item that's at least partially visible
    for (let i = 0; i < items.length; i++) {
      const rect = (items[i] as HTMLElement).getBoundingClientRect()
      if (rect.bottom > containerRect.top) {
        return i
      }
    }
    return 0
  }

  // If mouse is below container, return last visible item
  if (mouseY > containerRect.bottom) {
    // Find the last item that's at least partially visible
    for (let i = items.length - 1; i >= 0; i--) {
      const rect = (items[i] as HTMLElement).getBoundingClientRect()
      if (rect.top < containerRect.bottom) {
        return i
      }
    }
    return items.length - 1
  }

  // Mouse is inside container, find the item at this Y position
  for (let i = 0; i < items.length; i++) {
    const rect = (items[i] as HTMLElement).getBoundingClientRect()
    if (mouseY >= rect.top && mouseY <= rect.bottom) {
      return i
    }
  }

  // If between items or past all items, find closest
  let closestIdx = 0
  let closestDistance = Infinity

  items.forEach((item, idx) => {
    const rect = (item as HTMLElement).getBoundingClientRect()
    const itemCenterY = rect.top + rect.height / 2
    const distance = Math.abs(mouseY - itemCenterY)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIdx = idx
    }
  })

  return closestIdx
}

// Update selection based on current mouse position (called during drag and scroll)
const updateSelectionFromMousePosition = () => {
  const { container, lastMouseY } = autoScrollState
  if (!container) return

  const dragState = fileDragDropStore.getSnapshot()
  if (!dragState.context.isDragToSelect || !dragState.context.dragToSelectDirectoryId) return

  const directoryId = dragState.context.dragToSelectDirectoryId
  const startIdx = dragState.context.dragToSelectStartIdx!

  const currentIdx = findRowIndexAtPosition(container, lastMouseY, directoryId)
  if (currentIdx === null) return

  const state = directoryStore.getSnapshot()
  const directory = state.context.directoriesById[directoryId]
  if (!directory) return

  // Create selection range from start to current (linear selection for simplicity during scroll)
  const minIdx = Math.min(startIdx, currentIdx)
  const maxIdx = Math.max(startIdx, currentIdx)
  const newIndexes = new Set<number>()

  for (let i = minIdx; i <= maxIdx; i++) {
    newIndexes.add(i)
  }

  directoryStore.send({
    type: 'setSelection',
    indexes: newIndexes,
    last: currentIdx,
    directoryId,
  })
}

// Handler functions
export const fileDragDropHandlers = {
  // Start drag-to-select mode
  startDragToSelect: (
    startIdx: number,
    directoryId: DirectoryId,
    withMetaKey: boolean = false,
    startPosition: { x: number; y: number },
    scrollContainer?: HTMLElement | null
  ) => {
    fileDragDropStore.send({
      type: 'startDragToSelect',
      startIdx,
      directoryId,
      withMetaKey,
      startPosition,
    })
    // Add global mouseup listener to handle release anywhere
    document.body.addEventListener('mouseup', handleGlobalMouseUp)

    // Set up auto-scroll if container is provided
    if (scrollContainer) {
      autoScrollState = {
        container: scrollContainer,
        animationFrameId: null,
        lastMouseX: startPosition.x,
        lastMouseY: startPosition.y,
      }
      document.body.addEventListener('mousemove', handleGlobalMouseMove)
      // Start the auto-scroll loop
      autoScrollState.animationFrameId = requestAnimationFrame(autoScrollLoop)
    }
  },

  // End drag-to-select mode
  endDragToSelect: () => {
    fileDragDropStore.send({ type: 'endDragToSelect' })
    document.body.removeEventListener('mouseup', handleGlobalMouseUp)
    document.body.removeEventListener('mousemove', handleGlobalMouseMove)

    // Stop auto-scroll
    if (autoScrollState.animationFrameId !== null) {
      cancelAnimationFrame(autoScrollState.animationFrameId)
    }
    autoScrollState = {
      container: null,
      animationFrameId: null,
      lastMouseX: 0,
      lastMouseY: 0,
    }
  },

  // Start native drag - always uses Electron's native drag for outside-app compatibility
  // Also stores drag data in state for in-app drop handlers to use
  startNativeDrag: async (items: DragItem[], sourceDirectoryId: DirectoryId, e: React.DragEvent) => {
    // Store drag data in state for in-app drops (since native drag doesn't use dataTransfer)
    fileDragDropStore.send({
      type: 'setActiveDrag',
      activeDrag: { items, sourceDirectoryId },
    })

    // Create ghost element for Electron native drag
    const electronGhost = document.createElement('pre')
    electronGhost.className = 'drag-ghost'
    electronGhost.textContent = items.map(i => i.name).join('\n')

    const { rect, remove } = await captureDivAsBase64(electronGhost, e)
    electronGhost.remove()

    // Trigger Electron's native drag (works for outside-app drops)
    // e.preventDefault() is called in the component to enable this
    await getWindowElectron().onDragStart({
      files: items.map(i => i.fullPath),
      rect,
    })
    remove()
  },

  // Clear active drag (call on drag end)
  clearActiveDrag: () => {
    fileDragDropStore.send({
      type: 'setActiveDrag',
      activeDrag: null,
    })
  },

  // Get current active drag data (for in-app drop handlers)
  getActiveDrag: () => {
    return fileDragDropStore.getSnapshot().context.activeDrag
  },

  // Handle drag start on table rows (copies to clipboard for paste operations)
  handleRowDragStart: async (items: RealDirectoryItem[]) => {
    fileDragDropStore.trigger.setDraggedItems({ items: items.map(i => i.item) })
  },

  // Handle drag over on the table container
  handleTableDragOver: (e: React.DragEvent, directoryId: DirectoryId) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    fileDragDropStore.send({ type: 'setDragOverDirectory', directoryId })

    // Set dropEffect based on Alt key
    if (e.altKey) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'move'
    }
  },

  // Handle drag leave on the table container
  handleTableDragLeave: (e: React.DragEvent) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    // Only clear if we're actually leaving the container, not just moving between children
    const rect = e.currentTarget.getBoundingClientRect()
    const isOutside =
      e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom

    if (isOutside) {
      fileDragDropStore.send({
        type: 'setDragOverDirectory',
        directoryId: null,
      })
    }
  },

  // Handle drop on the table container
  handleTableDrop: async (
    e: React.DragEvent,
    directoryId: DirectoryId,
    directoryType: 'path' | 'tags',
    directoryFullPath?: string
  ) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    fileDragDropStore.send({
      type: 'setDragOverDirectory',
      directoryId: null,
    })

    // Only allow drops in path directories, not in tags view
    if (directoryType !== 'path' || !directoryFullPath) {
      toast.show({
        message: 'Cannot drop files in tags view',
        severity: 'error',
      })
      return
    }

    const isCopy = e.altKey // Alt key means copy instead of move

    try {
      await clipboardHelpers.paste(directoryId, { cut: !isCopy, paths: getDraggedItems() })

      // Activate the target directory
      directoryStore.send({
        type: 'setActiveDirectoryId',
        directoryId: directoryId,
      })
    } catch (error) {
      toast.show({
        message: error instanceof Error ? error.message : 'Failed to drop files',
        severity: 'error',
      })
    }
  },

  // Handle drag over on rows
  // Always stops propagation and decides whether to highlight the folder row or the current directory
  handleRowDragOver: (e: React.DragEvent, idx: number, isFolder: boolean, directoryId: DirectoryId) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // Always set the directory for preview purposes
    fileDragDropStore.send({ type: 'setDragOverDirectory', directoryId })

    // Check if we're over a no-drag-to-select element (like the file/folder name)
    const target = e.target as HTMLElement
    const isOnNoDragToSelect = target.closest('[data-no-drag-to-select]') !== null

    // If over a folder's no-drag-to-select zone, also highlight that folder row
    if (isFolder && isOnNoDragToSelect) {
      fileDragDropStore.send({ type: 'setDragOverRowIdx', value: idx })
    } else {
      // Otherwise, only highlight the directory (drop into current directory)
      fileDragDropStore.send({ type: 'setDragOverRowIdx', value: null })
    }

    // Set dropEffect based on Alt key
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'
  },

  // Handle drag leave on rows
  // Note: Since handleRowDragOver now handles all cases, this just needs to handle
  // leaving the row entirely (going outside the table area)
  handleRowDragLeave: (e: React.DragEvent) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    // Only clear if we're actually leaving the row entirely
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const isOutside =
      e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom

    if (isOutside) {
      fileDragDropStore.send({ type: 'setDragOverRowIdx', value: null })
    }
  },

  // Handle drop on rows
  // Drops into the folder if dragOverRowIdx is set (folder's no-drag-to-select zone), otherwise drops into current directory
  handleRowDrop: async (e: React.DragEvent, item: GetFilesAndFoldersInDirectoryItem, directoryId: DirectoryId) => {
    // Only handle file drags, ignore pane/tab drags
    if (!isFileDrag(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // Check if we should drop into folder based on the drag state (set by handleRowDragOver)
    const dragState = fileDragDropStore.getSnapshot().context
    const shouldDropIntoFolder = dragState.dragOverRowIdx !== null && item.type === 'dir'

    fileDragDropStore.send({ type: 'setDragOverRowIdx', value: null })
    fileDragDropStore.send({ type: 'setDragOverDirectory', directoryId: null })

    // Get directory info from store
    const directory = directoryStore.getSnapshot().context.directoriesById[directoryId]?.directory
    if (!directory) return

    if (shouldDropIntoFolder) {
      // Drop into the folder
      const targetDir = item.fullPath ?? directoryHelpers.getFullPath(item.name, directoryId)
      const isCopy = e.altKey

      try {
        // Navigate to the target folder first
        await directoryHelpers.cdFull(targetDir, directoryId)
        directoryStore.send({
          type: 'setActiveDirectoryId',
          directoryId: directoryId,
        })

        // Now paste into this directory using clipboardHelpers
        // This will handle conflicts and reload automatically
        await clipboardHelpers.paste(directoryId, { cut: !isCopy, paths: getDraggedItems() })
      } catch (error) {
        toast.show({
          message: error instanceof Error ? error.message : 'Failed to drop files',
          severity: 'error',
        })
      }
    } else {
      // Drop into the current directory (same logic as handleTableDrop)
      if (directory.type !== 'path') {
        toast.show({
          message: 'Cannot drop files in tags view',
          severity: 'error',
        })
        return
      }

      const isCopy = e.altKey

      try {
        await clipboardHelpers.paste(directoryId, { cut: !isCopy, paths: getDraggedItems() })

        directoryStore.send({
          type: 'setActiveDirectoryId',
          directoryId: directoryId,
        })
      } catch (error) {
        toast.show({
          message: error instanceof Error ? error.message : 'Failed to drop files',
          severity: 'error',
        })
      }
    }
  },
  isDragToSelect: () => {
    const dragState = fileDragDropStore.getSnapshot().context
    return dragState.isDragToSelect
  },
}
const getDraggedItems = () => {
  const dragState = fileDragDropStore.getSnapshot().context
  if (!dragState.items) {
    throw new Error('Dragged items not found')
  }
  return dragState.items.map(i => PathHelpers.expandHome(homeDirectory, i.fullPath!))
}

export function useDragOverThisRow(item: DerivedDirectoryItem, index: number, directoryId: DirectoryId) {
  return useSelector(fileDragDropStore, s => {
    return (
      item.type === 'real' &&
      s.context.dragOverDirectoryId === directoryId &&
      s.context.dragOverRowIdx === index &&
      item.item.type === 'dir'
    )
  })
}
