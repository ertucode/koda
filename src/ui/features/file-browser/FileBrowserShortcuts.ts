import { dialogActions, dialogStore } from './dialogStore'
import { directoryHelpers, directoryStore } from './directoryStore/directory'
import { clipboardHelpers } from './clipboardHelpers'
import { favoritesStore } from './favorites'
import { layoutModel } from './initializeDirectory'
import { Actions, TabNode } from 'flexlayout-react'
import { LayoutHelpers } from './utils/LayoutHelpers'
import { DirectoryId } from './directoryStore/DirectoryBase'
import { getFilteredData } from './directoryStore/directorySubscriptions'
import { directorySelection } from './directoryStore/directorySelection'
import { GlobalShortcuts } from '@/lib/hooks/globalShortcuts'
import { subscribeToStores } from '@/lib/functions/storeHelpers'
import { confirmation } from '@/lib/components/confirmation'
import { getCursorLine, getActiveDirectory } from './directoryStore/directoryPureHelpers'
import { VimShortcutHelper } from './vim/VimShortcutHelper'
import { FinderDialog } from './components/FinderDialog'
import { CommandPalette } from './components/CommandPalette'
import { CustomLayoutsDialog } from './components/CustomLayoutsDialog'
import { NewItemDialog } from './components/NewItemDialog'
import { BatchRenameDialog } from './components/BatchRenameDialog'
import { CreateFromClipboardDialog } from './components/CreateFromClipboardDialog'
import { getWindowElectron } from '@/getWindowElectron'
import { toast } from '@/lib/components/toast'
import { TableItemFinder } from '@/lib/libs/table/TableItemFinder'
import { fileBrowserSettingsStore } from './settings'

const SHORTCUTS_KEY = 'file-browser'

function getNthLayoutDirectory(n: number) {
  let dir: DirectoryId | undefined = undefined
  let count = 0
  const nodes: DirectoryId[] = []

  layoutModel.visitNodes(node => {
    // if (dir) return;
    if (node instanceof TabNode && node.getComponent() === 'directory') {
      if (node.getConfig()?.directoryId) {
        count++
        nodes.push(node.getConfig()?.directoryId)
        if (count === n) {
          dir = node.getConfig()?.directoryId
        }
      }
    }
  })

  return dir
}

let subscription: (() => void) | undefined = undefined

export const FileBrowserShortcuts = {
  init: () => {
    GlobalShortcuts.create({
      key: SHORTCUTS_KEY,
      shortcuts: [
        {
          key: ['Enter'],
          handler: e => {
            e?.preventDefault()
            directoryHelpers.openItemOnCursor(getFilteredData(), undefined)
          },
          label: 'Open item on cursor',
        },
        {
          key: { key: 'Enter', metaKey: true },
          handler: _ => {
            const snapshot = directoryStore.getSnapshot()
            const active = getActiveDirectory(snapshot.context, undefined)
            const cursorLine = getCursorLine(snapshot.context, active)
            if (cursorLine == null) return
            const data = getFilteredData()
            if (data.length === 0) {
              const container = TableItemFinder.findContainer(active.directoryId)
              if (!container) return

              directoryStore.trigger.showContextMenu({
                directoryId: active.directoryId,
                element: container as HTMLElement,
                item: undefined,
              })
              return
            }
            const found = TableItemFinder.findItem(active.directoryId, cursorLine)
            if (!found) return
            directoryStore.trigger.showContextMenu({
              directoryId: active.directoryId,
              element: found.row as HTMLElement,
              item: {
                index: cursorLine,
                item: data[cursorLine],
              },
            })
          },
          label: 'Open context menu on cursor',
        },
        {
          key: { key: 'p', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: FinderDialog,
              props: {
                initialTab: 'find',
                initialType: 'all',
              },
            })
          },
          label: 'Find all (files and folders)',
        },
        {
          key: { key: 'k', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: CommandPalette,
              props: {},
            })
          },
          label: 'Show keyboard shortcuts',
        },
        {
          key: { key: 'l', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: CustomLayoutsDialog,
              props: {},
            })
          },
          label: 'Manage custom layouts',
        },
        {
          key: { key: 's', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: FinderDialog,
              props: {
                initialTab: 'strings',
              },
            })
          },
          label: 'Find string',
        },
        {
          key: { key: 'f', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: FinderDialog,
              props: {
                initialTab: 'find',
                initialType: 'file',
              },
            })
          },
          label: 'Find file',
        },
        {
          key: { key: 'o', ctrlKey: true },
          handler: _ => {
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goPrev, undefined)
          },
          label: 'Go to previous directory',
        },
        {
          key: { key: 'i', ctrlKey: true },
          handler: _ => {
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goNext, undefined)
          },
          label: 'Go to next directory',
        },
        {
          key: ['-'],
          handler: () => {
            const [shouldRun] = VimShortcutHelper.shouldRun()
            if (!shouldRun) return
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goUp, undefined)
          },
          label: 'Go up to parent directory',
        },
        {
          key: { key: 'Backspace', metaKey: true },
          handler: () => {
            const items = directorySelection.getSelectedRealsOrCurrentReal(undefined)
            if (items)
              directoryHelpers.handleDelete(
                items.map(i => i.item),
                getFilteredData(),
                undefined
              )
          },
          enabledIn: () => true,
          label: 'Delete selected items',
        },
        {
          key: { key: 'n', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            dialogActions.open({
              component: NewItemDialog,
              props: undefined,
            })
          },
          label: 'Create new item',
        },
        {
          key: 'r',
          notKey: { key: 'r', metaKey: true },
          handler: e => {
            const [shouldRun] = VimShortcutHelper.shouldRun()
            if (!shouldRun) return
            e?.preventDefault()
            directoryHelpers.reload(undefined)
          },
          label: 'Reload directory',
        },
        {
          key: { key: 'r', metaKey: true, shiftKey: true },
          handler: e => {
            e?.preventDefault()
            const itemsToRename = directorySelection.getSelectedRealsOrCurrentReal(undefined)
            if (!itemsToRename) return
            const itemsToRenameMapped = itemsToRename.filter(i => i.type === 'real').map(i => i.item)
            dialogActions.open({
              component: BatchRenameDialog,
              props: {
                items: itemsToRenameMapped,
              },
            })
          },
          enabledIn: () => true,
          label: 'Batch rename selected items',
        },
        {
          key: { key: 'c', metaKey: true },
          handler: e => {
            // Check if user is selecting text
            const selection = window.getSelection()
            if (selection && selection.toString().length > 0) {
              return // Allow default text copy
            }

            e?.preventDefault()
            const itemsToCopy = directorySelection.getSelectedRealsOrCurrentReal(undefined)
            if (!itemsToCopy) return
            const itemsToCopyMapped = itemsToCopy.filter(i => i.type === 'real').map(i => i.item)
            clipboardHelpers.copy(itemsToCopyMapped, false, undefined)
          },
          enabledIn: () => true,
          label: 'Copy selected items',
        },
        {
          key: { key: 'x', metaKey: true },
          handler: e => {
            // Check if user is selecting text
            const selection = window.getSelection()
            if (selection && selection.toString().length > 0) {
              return // Allow default text cut
            }

            e?.preventDefault()
            const itemsToCut = directorySelection.getSelectedRealsOrCurrentReal(undefined)
            if (!itemsToCut) return
            const itemsToCutMapped = itemsToCut.filter(i => i.type === 'real').map(i => i.item)
            clipboardHelpers.copy(itemsToCutMapped, true, undefined)
          },
          enabledIn: () => true,
          label: 'Cut selected items',
        },
        {
          key: { key: 'v', metaKey: true },
          handler: e => {
            // Check if user is in an input field
            const target = e?.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
              return // Allow default paste in inputs
            }

            e?.preventDefault()
            clipboardHelpers.paste(undefined)
          },
          enabledIn: () => true,
          label: 'Paste items',
        },
        {
          key: { key: 'v', metaKey: true, shiftKey: true },
          handler: async e => {
            e?.preventDefault()
            const customPasteType = await getWindowElectron().getCustomPasteType()
            if (!customPasteType) {
              toast.show({
                severity: 'info',
                message: 'No pasteable data in clipboard',
              })
              return
            }

            dialogActions.open({
              component: CreateFromClipboardDialog,
              props: { pasteType: customPasteType },
            })
          },
          enabledIn: () => true,
          label: 'Paste image, base64 data, or text from clipboard',
        },
        {
          key: { key: 'v', metaKey: true, ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            directoryStore.send({
              type: 'toggleViewMode',
              directoryId: undefined,
            })
          },
          label: 'Toggle view mode (list/grid)',
        },
        {
          key: { key: '0', ctrlKey: true },
          handler: _ => {
            // @ts-ignore
            document.querySelector('webview')?.openDevTools()
          },
          label: 'Open dev tools',
          enabledIn: () => true,
        },
        {
          key: { key: '/' },
          handler: e => {
            directoryStore.trigger.focusFuzzyInput({ e })
          },
          label: 'Focus search',
        },
        {
          key: { key: 'l', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            directoryHelpers.loadDirectorySizes(undefined)
          },
          label: 'Load directory sizes',
        },
        {
          key: { key: 't', metaKey: true },
          handler: e => {
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getActiveTabsetThatHasDirectory()
            if (!activeTabSet) return

            directoryHelpers.createDirectory({
              tabId: activeTabSet.getId(),
            })
          },
          label: 'New tab',
        },
        {
          key: { key: 'm', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getActiveTabsetWithComponent(['directory', 'preview'])
            if (!activeTabSet) return

            layoutModel.doAction(Actions.maximizeToggle(activeTabSet.getId()))
          },
          label: 'Maximize/Minimize',
        },
        {
          key: { key: 'm', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getTabsetWithComponent(['preview'])
            if (!activeTabSet) return

            layoutModel.doAction(Actions.maximizeToggle(activeTabSet.getId()))
          },
          label: 'Maximize/Minimize Preview',
        },
        {
          key: { key: 'w', metaKey: true },
          handler: e => {
            if (directoryStore.getSnapshot().context.directoryOrder.length === 1) {
              // Close the window
              return
            }
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getActiveTabsetThatHasDirectory()
            if (!activeTabSet) return

            const activeTab = LayoutHelpers.getActiveTabsetThatHasDirectory()?.getSelectedNode()
            if (!activeTab) return
            if (!LayoutHelpers.isDirectory(activeTab)) return

            layoutModel.doAction(Actions.deleteTab(activeTab.getId()))
          },
          label: 'Close tab',
        },
        ...directorySelection.getSelectionShortcuts(),
        // Option+1 through Option+9 to open favorites
        ...Array.from({ length: 9 }, (_, i) => ({
          key: { key: `Digit${i + 1}`, isCode: true, altKey: true },
          handler: (e: KeyboardEvent | undefined) => {
            e?.preventDefault()
            const favorite = favoritesStore.get().context.favorites[i]
            if (favorite) {
              // Use the current active directory, not the one from the closure
              const currentActiveId = directoryStore.getSnapshot().context.activeDirectoryId
              directoryHelpers.openItemFull(favorite, currentActiveId)
            }
          },
          label: `Open favorite ${i + 1}`,
        })),
        ...new Array(10).fill(0).map((_, i) => ({
          key: { key: (i + 1).toString(), metaKey: true },
          handler: (e: KeyboardEvent | undefined) => {
            e?.preventDefault()
            const dir = getNthLayoutDirectory(i + 1)
            if (!dir) return

            directoryStore.send({
              type: 'setActiveDirectoryId',
              directoryId: dir,
            })
          },
          label: `Switch to pane ${i + 1}`,
        })),
      ],
      enabled: true,
      sequences: [
        {
          // Go to the top (like vim gg)
          sequence: ['g', 'g'],
          handler: e => {
            directoryStore.trigger.setCursor({ cursor: { line: 0 }, directoryId: undefined })
            e?.preventDefault()
          },
          label: 'Go to first item',
        },
        {
          sequence: ['g', '.'],
          handler: () => {
            fileBrowserSettingsStore.trigger.toggleShowDotFiles()
          },
          label: 'Toggle show dot files',
        },
      ],
    })

    subscription = subscribeToStores(
      [dialogStore, confirmation],
      ([dialog, confirmation]) => [!dialog.state, confirmation.isOpen],
      ([dialog, confirmation]) => {
        const enabled = !dialog.state && !confirmation.isOpen
        GlobalShortcuts.updateEnabled(SHORTCUTS_KEY, enabled)
      }
    )
  },
  deinit: () => {
    GlobalShortcuts.updateEnabled(SHORTCUTS_KEY, false)
    subscription?.()
  },
}

export const commands = [
  { code: 'Enter', command: 'file_browser_open_item', label: 'Open item on cursor' },
  { code: { code: 'Enter', metaKey: true }, command: 'file_browser_context_menu', label: 'Open context menu on cursor' },
  { code: { code: 'KeyP', ctrlKey: true }, command: 'file_browser_find_all', label: 'Find all (files and folders)' },
  { code: { code: 'KeyK', ctrlKey: true, metaKey: true }, command: 'file_browser_show_shortcuts', label: 'Show keyboard shortcuts' },
  { code: { code: 'KeyL', ctrlKey: true, metaKey: true }, command: 'file_browser_manage_layouts', label: 'Manage custom layouts' },
  { code: { code: 'KeyS', ctrlKey: true }, command: 'file_browser_find_string', label: 'Find string' },
  { code: { code: 'KeyF', ctrlKey: true }, command: 'file_browser_find_file', label: 'Find file' },
  { code: { code: 'KeyO', ctrlKey: true }, command: 'file_browser_go_previous', label: 'Go to previous directory' },
  { code: { code: 'KeyI', ctrlKey: true }, command: 'file_browser_go_next', label: 'Go to next directory' },
  { code: 'Minus', command: 'file_browser_go_up', label: 'Go up to parent directory' },
  { code: { code: 'Backspace', metaKey: true }, command: 'file_browser_delete', label: 'Delete selected items' },
  { code: { code: 'KeyN', ctrlKey: true }, command: 'file_browser_new_item', label: 'Create new item' },
  { code: 'KeyR', command: 'file_browser_reload', label: 'Reload directory' },
  { code: { code: 'KeyR', metaKey: true, shiftKey: true }, command: 'file_browser_batch_rename', label: 'Batch rename selected items' },
  { code: { code: 'KeyC', metaKey: true }, command: 'file_browser_copy', label: 'Copy selected items' },
  { code: { code: 'KeyX', metaKey: true }, command: 'file_browser_cut', label: 'Cut selected items' },
  { code: { code: 'KeyV', metaKey: true }, command: 'file_browser_paste', label: 'Paste items' },
  { code: { code: 'KeyV', metaKey: true, shiftKey: true }, command: 'file_browser_paste_clipboard', label: 'Paste image, base64 data, or text from clipboard' },
  { code: { code: 'KeyV', metaKey: true, ctrlKey: true }, command: 'file_browser_toggle_view', label: 'Toggle view mode (list/grid)' },
  { code: { code: 'Digit0', ctrlKey: true }, command: 'file_browser_dev_tools', label: 'Open dev tools' },
  { code: 'Slash', command: 'file_browser_focus_search', label: 'Focus search' },
  { code: { code: 'KeyL', ctrlKey: true, metaKey: true }, command: 'file_browser_load_sizes', label: 'Load directory sizes' },
  { code: { code: 'KeyT', metaKey: true }, command: 'file_browser_new_tab', label: 'New tab' },
  { code: { code: 'KeyM', ctrlKey: true }, command: 'file_browser_maximize', label: 'Maximize/Minimize' },
  { code: { code: 'KeyM', ctrlKey: true, metaKey: true }, command: 'file_browser_maximize_preview', label: 'Maximize/Minimize Preview' },
  { code: { code: 'KeyW', metaKey: true }, command: 'file_browser_close_tab', label: 'Close tab' },
  // Favorites shortcuts
  { code: { code: 'Digit1', altKey: true }, command: 'file_browser_favorite_1', label: 'Open favorite 1' },
  { code: { code: 'Digit2', altKey: true }, command: 'file_browser_favorite_2', label: 'Open favorite 2' },
  { code: { code: 'Digit3', altKey: true }, command: 'file_browser_favorite_3', label: 'Open favorite 3' },
  { code: { code: 'Digit4', altKey: true }, command: 'file_browser_favorite_4', label: 'Open favorite 4' },
  { code: { code: 'Digit5', altKey: true }, command: 'file_browser_favorite_5', label: 'Open favorite 5' },
  { code: { code: 'Digit6', altKey: true }, command: 'file_browser_favorite_6', label: 'Open favorite 6' },
  { code: { code: 'Digit7', altKey: true }, command: 'file_browser_favorite_7', label: 'Open favorite 7' },
  { code: { code: 'Digit8', altKey: true }, command: 'file_browser_favorite_8', label: 'Open favorite 8' },
  { code: { code: 'Digit9', altKey: true }, command: 'file_browser_favorite_9', label: 'Open favorite 9' },
  // Pane switching
  { code: { code: 'Digit1', metaKey: true }, command: 'file_browser_pane_1', label: 'Switch to pane 1' },
  { code: { code: 'Digit2', metaKey: true }, command: 'file_browser_pane_2', label: 'Switch to pane 2' },
  { code: { code: 'Digit3', metaKey: true }, command: 'file_browser_pane_3', label: 'Switch to pane 3' },
  { code: { code: 'Digit4', metaKey: true }, command: 'file_browser_pane_4', label: 'Switch to pane 4' },
  { code: { code: 'Digit5', metaKey: true }, command: 'file_browser_pane_5', label: 'Switch to pane 5' },
  { code: { code: 'Digit6', metaKey: true }, command: 'file_browser_pane_6', label: 'Switch to pane 6' },
  { code: { code: 'Digit7', metaKey: true }, command: 'file_browser_pane_7', label: 'Switch to pane 7' },
  { code: { code: 'Digit8', metaKey: true }, command: 'file_browser_pane_8', label: 'Switch to pane 8' },
  { code: { code: 'Digit9', metaKey: true }, command: 'file_browser_pane_9', label: 'Switch to pane 9' },
  { code: { code: 'Digit0', metaKey: true }, command: 'file_browser_pane_10', label: 'Switch to pane 10' },
  // Sequences
  { sequence: ['KeyG', 'KeyG'], command: 'file_browser_go_first', label: 'Go to first item' },
  { sequence: ['KeyG', 'Period'], command: 'file_browser_toggle_dotfiles', label: 'Toggle show dot files' },
]
