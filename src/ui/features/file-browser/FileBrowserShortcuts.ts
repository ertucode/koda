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
          command: 'file_browser_open_item',
          code: ['Enter'],
          handler: e => {
            e?.preventDefault()
            directoryHelpers.openItemOnCursor(getFilteredData(), undefined)
          },
          label: 'Open item on cursor',
        },
        {
          command: 'file_browser_context_menu',
          code: { code: 'Enter', metaKey: true },
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
          command: 'file_browser_find_all',
          code: { code: 'KeyP', ctrlKey: true },
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
          command: 'file_browser_show_shortcuts',
          code: { code: 'KeyK', ctrlKey: true, metaKey: true },
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
          command: 'file_browser_manage_layouts',
          code: { code: 'KeyL', metaKey: true },
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
          command: 'file_browser_find_string',
          code: { code: 'KeyS', ctrlKey: true },
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
          command: 'file_browser_find_file',
          code: { code: 'KeyF', ctrlKey: true },
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
          command: 'file_browser_go_previous',
          code: { code: 'KeyO', ctrlKey: true },
          handler: _ => {
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goPrev, undefined)
          },
          label: 'Go to previous directory',
        },
        {
          command: 'file_browser_go_next',
          code: { code: 'KeyI', ctrlKey: true },
          handler: _ => {
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goNext, undefined)
          },
          label: 'Go to next directory',
        },
        {
          command: 'file_browser_go_up',
          code: ['Minus'],
          handler: () => {
            const [shouldRun] = VimShortcutHelper.shouldRun()
            if (!shouldRun) return
            directoryHelpers.onGoUpOrPrev(directoryHelpers.goUp, undefined)
          },
          label: 'Go up to parent directory',
        },
        {
          command: 'file_browser_delete',
          code: { code: 'Backspace', metaKey: true },
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
          command: 'file_browser_new_item',
          code: { code: 'KeyN', ctrlKey: true },
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
          command: 'file_browser_reload',
          code: 'KeyR',
          notCode: { code: 'KeyR', metaKey: true },
          handler: e => {
            const [shouldRun] = VimShortcutHelper.shouldRun()
            if (!shouldRun) return
            e?.preventDefault()
            directoryHelpers.reload(undefined)
          },
          label: 'Reload directory',
        },
        {
          command: 'file_browser_batch_rename',
          code: { code: 'KeyR', metaKey: true, shiftKey: true },
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
          command: 'file_browser_copy',
          code: { code: 'KeyC', metaKey: true },
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
          command: 'file_browser_cut',
          code: { code: 'KeyX', metaKey: true },
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
          command: 'file_browser_paste',
          code: { code: 'KeyV', metaKey: true },
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
          command: 'file_browser_paste_clipboard',
          code: { code: 'KeyV', metaKey: true, shiftKey: true },
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
          command: 'file_browser_toggle_view',
          code: { code: 'KeyV', metaKey: true, ctrlKey: true },
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
          command: 'file_browser_dev_tools',
          code: { code: 'Digit0', ctrlKey: true },
          handler: _ => {
            // @ts-ignore
            document.querySelector('webview')?.openDevTools()
          },
          label: 'Open dev tools',
          enabledIn: () => true,
        },
        {
          command: 'file_browser_focus_search',
          code: { code: 'Slash' },
          handler: e => {
            directoryStore.trigger.focusFuzzyInput({ e })
          },
          label: 'Focus search',
        },
        {
          command: 'file_browser_load_sizes',
          code: { code: 'KeyL', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            directoryHelpers.loadDirectorySizes(undefined)
          },
          label: 'Load directory sizes',
        },
        {
          command: 'file_browser_new_tab',
          code: { code: 'KeyT', metaKey: true },
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
          command: 'file_browser_maximize',
          code: { code: 'KeyM', ctrlKey: true },
          handler: e => {
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getActiveTabsetWithComponent(['directory', 'preview'])
            if (!activeTabSet) return

            layoutModel.doAction(Actions.maximizeToggle(activeTabSet.getId()))
          },
          label: 'Maximize/Minimize',
        },
        {
          command: 'file_browser_maximize_preview',
          code: { code: 'KeyM', ctrlKey: true, metaKey: true },
          handler: e => {
            e?.preventDefault()
            const activeTabSet = LayoutHelpers.getTabsetWithComponent(['preview'])
            if (!activeTabSet) return

            layoutModel.doAction(Actions.maximizeToggle(activeTabSet.getId()))
          },
          label: 'Maximize/Minimize Preview',
        },
        {
          command: 'file_browser_close_tab',
          code: { code: 'KeyW', metaKey: true },
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
          command: `file_browser_favorite_${i + 1}`,
          code: { code: `Digit${i + 1}`, altKey: true },
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
          command: `file_browser_pane_${i + 1}`,
          code: { code: `Digit${i + 1}`, metaKey: true },
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
          command: 'file_browser_go_first',
          // Go to the top (like vim gg)
          sequence: ['KeyG', 'KeyG'],
          handler: e => {
            directoryStore.trigger.setCursor({ cursor: { line: 0 }, directoryId: undefined })
            e?.preventDefault()
          },
          label: 'Go to first item',
        },
        {
          command: 'file_browser_toggle_dotfiles',
          sequence: ['KeyG', 'Period'],
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
