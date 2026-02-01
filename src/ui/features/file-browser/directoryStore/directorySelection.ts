import { ShortcutWithHandler } from '@/lib/hooks/useShortcuts'
import { createResetSelection, directoryStore } from './directory'
import { DirectoryId } from './DirectoryBase'
import { getActiveDirectory, getBufferSelection, getFullPathForBuffer, selectBuffer } from './directoryPureHelpers'
import { directoryDerivedStores } from './directorySubscriptions'
import { throttle } from '@common/throttle'

type ShortcutWithCommand = ShortcutWithHandler & { command: string }

export const directorySelection = {
  // Selection helpers
  select: (
    index: number,
    event: React.MouseEvent | KeyboardEvent | undefined,
    _directoryId: DirectoryId | undefined
  ) => {
    const snapshot = directoryStore.getSnapshot()
    const state = getActiveDirectory(snapshot.context, _directoryId)
    const directoryId = state.directoryId
    const filteredData = directoryDerivedStores.get(state.directoryId)!.getFilteredDirectoryData()!
    index = index < 0 ? filteredData.length + index : index
    const selection = getBufferSelection(snapshot.context, state)

    // Helper to remove item from set
    const removeFromSet = (set: Set<number>, item: number) => {
      const newSet = new Set(set)
      newSet.delete(item)
      return newSet
    }

    const isShiftEvent = event && event.shiftKey && (!('key' in event) || (event.key !== 'G' && event.key !== 'g'))
    if (isShiftEvent && selection.last != null) {
      const lastSelected = selection.last
      const indexes = new Set(selection.indexes)

      if (lastSelected > index) {
        let allSelected = true
        for (let i = lastSelected - 1; i >= index; i--) {
          if (!indexes.has(i)) {
            allSelected = false
            break
          }
        }

        if (allSelected) {
          for (let i = lastSelected - 1; i >= index; i--) {
            indexes.delete(i)
          }
        } else {
          for (let i = lastSelected - 1; i >= index; i--) {
            indexes.add(i)
          }
        }
      } else {
        let allSelected = true
        for (let i = lastSelected + 1; i <= index; i++) {
          if (!indexes.has(i)) {
            allSelected = false
            break
          }
        }

        if (allSelected) {
          for (let i = lastSelected + 1; i <= index; i++) {
            indexes.delete(i)
          }
        } else {
          for (let i = lastSelected + 1; i <= index; i++) {
            indexes.add(i)
          }
        }
      }

      directoryStore.send({
        type: 'setSelection',
        indexes,
        last: index,
        directoryId,
      })
      return
    }

    const isCtrlEvent = event && event.metaKey
    if (isCtrlEvent) {
      if (selection.indexes.has(index)) {
        directoryStore.send({
          type: 'setSelection',
          indexes: removeFromSet(selection.indexes, index),
          last: index,
          directoryId,
        })
        return
      }
      directoryStore.send({
        type: 'setSelection',
        indexes: new Set([...selection.indexes, index]),
        last: index,
        directoryId,
      })
      return
    }

    directoryStore.send({
      type: 'setSelection',
      indexes: new Set([index]),
      last: index,
      directoryId,
    })
  },

  getSelectionShortcuts: (): ShortcutWithCommand[] => {
    // Helper function to get current cursor position
    const getCursorPosition = () => {
      const snapshot = directoryStore.getSnapshot()
      const state = getActiveDirectory(snapshot.context, undefined)
      const selection = getBufferSelection(snapshot.context, state)
      const fullPath = getFullPathForBuffer(state.directory)
      const vimBuffer = fullPath ? snapshot.context.vim.buffers[fullPath] : undefined
      return {
        state,
        selection,
        cursorLine: vimBuffer?.cursor.line ?? selection.last ?? 0,
        filteredData: directoryDerivedStores.get(state.directoryId)!.getFilteredDirectoryData()!,
      }
    }

    // Helper function to move cursor and optionally modify selection
    const moveCursor = (
      offset: number,
      mode: 'replace' | 'add' | 'toggle' | 'remove',
      e?: KeyboardEvent | React.KeyboardEvent
    ) => {
      const { state, selection, cursorLine, filteredData } = getCursorPosition()
      const count = filteredData.length

      let targetIndex = cursorLine + offset
      // Wrap around
      if (targetIndex < 0) targetIndex = count - 1
      if (targetIndex >= count) targetIndex = 0

      const indexes = new Set(selection.indexes)

      if (mode === 'replace') {
        // Clear selection and select only target
        indexes.clear()
        indexes.add(targetIndex)
      } else if (mode === 'add') {
        // Add current item to selection first, then add target
        indexes.add(cursorLine)
        indexes.add(targetIndex)
      } else if (mode === 'toggle') {
        // Toggle target in selection
        if (indexes.has(targetIndex)) {
          indexes.delete(targetIndex)
        } else {
          indexes.add(targetIndex)
        }
      } else if (mode === 'remove') {
        // Remove current item from selection first, then remove target
        indexes.delete(cursorLine)
        indexes.delete(targetIndex)
      }

      directoryStore.send({
        type: 'setSelection',
        indexes,
        last: targetIndex,
        directoryId: state.directoryId,
      })
      e?.preventDefault()
    }

    // Helper function to calculate columns in grid view
    const getColumnsPerRow = (): number => {
      const context = getActiveDirectory(directoryStore.getSnapshot().context, undefined)
      if (context.viewMode !== 'grid') return 1

      const gridContainer = document.querySelector(`[data-list-id="${context.directoryId}"] > div`) as HTMLElement
      if (!gridContainer) return 1

      const gridItems = gridContainer.querySelectorAll('[data-list-item]')
      if (gridItems.length < 2) return 1

      const firstItem = gridItems[0] as HTMLElement
      const secondItem = gridItems[1] as HTMLElement
      const firstRect = firstItem.getBoundingClientRect()
      const secondRect = secondItem.getBoundingClientRect()

      if (Math.abs(firstRect.top - secondRect.top) < 10) {
        let cols = 1
        for (let i = 1; i < gridItems.length; i++) {
          const itemRect = (gridItems[i] as HTMLElement).getBoundingClientRect()
          if (Math.abs(itemRect.top - firstRect.top) < 10) {
            cols++
          } else {
            break
          }
        }
        return cols
      }

      return 1
    }

    const THROTTLE_DELAY = 0

    return [
      // Cmd+A: Select all
      {
        command: 'file_browser_select_all',
        code: [{ code: 'KeyA', metaKey: true }],
        handler: e => {
          const { state, filteredData } = getCursorPosition()
          directoryStore.send({
            type: 'setSelection',
            indexes: new Set(Array.from({ length: filteredData.length }).map((_, i) => i)),
            last: filteredData.length - 1,
            directoryId: state.directoryId,
          })
          e?.preventDefault()
        },
        label: 'Select all items',
      },

      // Shift+Space: Toggle current item
      {
        command: 'file_browser_toggle_selection',
        code: { code: 'KeyV', shiftKey: true },
        handler: e => moveCursor(0, 'toggle', e),
        label: 'Toggle selection of current item',
      },

      // Space: Set selection to current item only
      {
        command: 'file_browser_select_current',
        code: { code: 'KeyV' },
        handler: e => moveCursor(0, 'replace', e),
        label: 'Select only current item',
      },

      // J/ArrowDown: Move down (replace selection)
      {
        command: 'file_browser_move_down',
        code: ['KeyJ', 'ArrowDown'],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(offset, 'replace', e)
        }, THROTTLE_DELAY),
        label: 'Move down',
      },

      // K/ArrowUp: Move up (replace selection)
      {
        command: 'file_browser_move_up',
        code: ['KeyK', 'ArrowUp'],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(-offset, 'replace', e)
        }, THROTTLE_DELAY),
        label: 'Move up',
      },

      // J/Shift+ArrowDown: Move down and add to selection
      {
        command: 'file_browser_move_down_add',
        code: [
          { code: 'KeyJ', shiftKey: true },
          { code: 'ArrowDown', shiftKey: true },
        ],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(offset, 'add', e)
        }, THROTTLE_DELAY),
        label: 'Move down and add to selection',
      },

      // K/Shift+ArrowUp: Move up and add to selection
      {
        command: 'file_browser_move_up_add',
        code: [
          { code: 'KeyK', shiftKey: true },
          { code: 'ArrowUp', shiftKey: true },
        ],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(-offset, 'add', e)
        }, THROTTLE_DELAY),
        label: 'Move up and add to selection',
      },

      // h/ArrowLeft: Move left in grid, jump up 10 in list
      {
        command: 'file_browser_move_left',
        code: ['KeyH', 'ArrowLeft'],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? -1 : -10
          moveCursor(offset, 'replace', e)
        }, THROTTLE_DELAY),
        label: 'Move left or jump up',
      },

      // l/ArrowRight: Move right in grid, jump down 10 in list
      {
        command: 'file_browser_move_right',
        code: ['KeyL', 'ArrowRight'],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? 1 : 10
          moveCursor(offset, 'replace', e)
        }, THROTTLE_DELAY),
        label: 'Move right or jump down',
      },

      // H/Shift+ArrowLeft: Move left and add in grid, jump up 10 and add in list
      {
        command: 'file_browser_move_left_add',
        code: [
          { code: 'KeyH', shiftKey: true },
          { code: 'ArrowLeft', shiftKey: true },
        ],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? -1 : -10
          moveCursor(offset, 'add', e)
        }, THROTTLE_DELAY),
        label: 'Move left and add to selection',
      },

      // L/Shift+ArrowRight: Move right and add in grid, jump down 10 and add in list
      {
        command: 'file_browser_move_right_add',
        code: [
          { code: 'KeyL', shiftKey: true },
          { code: 'ArrowRight', shiftKey: true },
        ],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? 1 : 10
          moveCursor(offset, 'add', e)
        }, THROTTLE_DELAY),
        label: 'Move right and add to selection',
      },

      // Ctrl+J/Cmd+ArrowDown: Move down and remove from selection
      {
        command: 'file_browser_move_down_remove',
        code: [
          { code: 'KeyJ', ctrlKey: true },
          { code: 'ArrowDown', metaKey: true },
        ],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(offset, 'remove', e)
        }, THROTTLE_DELAY),
        label: 'Move down and remove from selection',
      },

      // Ctrl+K/Cmd+ArrowUp: Move up and remove from selection
      {
        command: 'file_browser_move_up_remove',
        code: [
          { code: 'KeyK', ctrlKey: true },
          { code: 'ArrowUp', metaKey: true },
        ],
        handler: throttle(e => {
          const cols = getColumnsPerRow()
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? cols : 1
          moveCursor(-offset, 'remove', e)
        }, THROTTLE_DELAY),
        label: 'Move up and remove from selection',
      },

      // Ctrl+H/Cmd+ArrowLeft: Move left and remove in grid, jump up 10 and remove in list
      {
        command: 'file_browser_move_left_remove',
        code: [
          { code: 'KeyH', ctrlKey: true },
          { code: 'ArrowLeft', metaKey: true },
        ],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? -1 : -10
          moveCursor(offset, 'remove', e)
        }, THROTTLE_DELAY),
        label: 'Move left and remove from selection',
      },

      // Ctrl+L/Cmd+ArrowRight: Move right and remove in grid, jump down 10 and remove in list
      {
        command: 'file_browser_move_right_remove',
        code: [
          { code: 'KeyL', ctrlKey: true },
          { code: 'ArrowRight', metaKey: true },
        ],
        handler: throttle(e => {
          const snapshot = directoryStore.getSnapshot()
          const state = getActiveDirectory(snapshot.context, undefined)
          const offset = state.viewMode === 'grid' ? 1 : 10
          moveCursor(offset, 'remove', e)
        }, THROTTLE_DELAY),
        label: 'Move right and remove from selection',
      },

      // Shift+G: Go to last item
      {
        command: 'file_browser_go_last',
        code: { code: 'KeyG', shiftKey: true },
        handler: e => {
          const { state, filteredData } = getCursorPosition()
          directoryStore.trigger.setCursor({
            cursor: { line: filteredData.length - 1 },
            directoryId: state.directoryId,
          })
          e?.preventDefault()
        },
        label: 'Go to last item',
      },

      // Ctrl+D: Page down
      {
        command: 'file_browser_page_down',
        code: { code: 'KeyD', ctrlKey: true },
        handler: throttle(e => moveCursor(10, 'replace', e), THROTTLE_DELAY),
        label: 'Page down',
      },

      // Ctrl+U: Page up
      {
        command: 'file_browser_page_up',
        code: { code: 'KeyU', ctrlKey: true },
        handler: throttle(e => moveCursor(-10, 'replace', e), THROTTLE_DELAY),
        label: 'Page up',
      },
    ]
  },

  resetSelection: (directoryId: DirectoryId | undefined) => {
    const s = createResetSelection()
    directoryStore.send({ type: 'setSelection', directoryId, ...s })
  },

  isSelected: (index: number, directoryId: DirectoryId) => {
    const active = getActiveDirectory(directoryStore.getSnapshot().context, directoryId)
    const selection = getBufferSelection(directoryStore.getSnapshot().context, active)
    return selection.indexes.has(index)
  },

  selectManually: (index: number, directoryId: DirectoryId | undefined) => {
    directoryStore.send({ type: 'selectManually', index, directoryId })
  },

  setSelection: (h: number | ((s: number) => number), directoryId: DirectoryId) => {
    const active = getActiveDirectory(directoryStore.getSnapshot().context, directoryId)
    const selection = getBufferSelection(directoryStore.getSnapshot().context, active)
    let newSelection: number
    if (selection.indexes.size === 0) {
      newSelection = typeof h === 'number' ? h : h(0)
    } else if (selection.indexes.size === 1) {
      newSelection = typeof h === 'number' ? h : h(selection.last!)
    } else {
      newSelection = typeof h === 'number' ? h : h(selection.last!)
    }
    directoryStore.send({
      type: 'setSelection',
      indexes: new Set([newSelection]),
      last: newSelection,
      directoryId,
    })
  },

  getSelectedRealsOrCurrentReal: (directoryId: DirectoryId | undefined) => {
    const snapshot = directoryStore.getSnapshot()
    const buffer = selectBuffer(snapshot.context, directoryId)
    if (!buffer) return undefined

    const selection = buffer.selection.indexes
    const result = [...selection].map(i => buffer.items[i]).filter(i => i.type === 'real')
    if (result.length <= 1) {
      const item = buffer.items[buffer.cursor.line]
      if (item.type === 'real') return [item]
      return undefined
    }
    return result
  },
}
