import { ContextMenuItem, ContextMenuList } from '@/lib/components/context-menu'
import { TextWithIcon } from '@/lib/components/text-with-icon'
import { useSelector } from '@xstate/store/react'
import {
  StarOffIcon,
  StarIcon,
  CopyIcon,
  ScissorsIcon,
  ClipboardPasteIcon,
  Trash2Icon,
  PencilIcon,
  PencilLineIcon,
  FilePlusIcon,
  TagIcon,
  FolderCogIcon,
  FolderPlusIcon,
  ClipboardCopyIcon,
  FileArchiveIcon,
  FolderInputIcon,
  HardDriveIcon,
  ExternalLinkIcon,
  TerminalIcon,
  BoxSelectIcon,
  FileTextIcon,
  EyeIcon,
} from 'lucide-react'
import { setDefaultPath } from './defaultPath'
import { dialogActions } from './dialogStore'
import { directoryHelpers, directoryStore } from './directoryStore/directory'
import { clipboardHelpers } from './clipboardHelpers'
import { selectIsFavorite, favoritesStore } from './favorites'
import { tagsStore, selectLastUsedTag, selectHasTag, selectTagName, TAG_COLOR_CLASSES } from './tags'
import { useDirectoryContext } from './DirectoryContext'
import { toast } from '@/lib/components/toast'
import { getWindowElectron, windowArgs } from '@/getWindowElectron'
import { useState, useEffect } from 'react'
import { ApplicationInfo } from '@common/Contracts'
import { ArchiveHelpers } from '@common/ArchiveHelpers'
import { supportsBase64Copy } from '@common/Base64Helpers'
import { CommandHelpers } from './CommandHelpers'
import { checkGlob } from '@/lib/functions/checkGlob'
import { DerivedDirectoryItem, RealDirectoryItem } from './directoryStore/DirectoryBase'
import { getActiveDirectory, getBufferSelection } from './directoryStore/directoryPureHelpers'
import { RenameDialog } from './components/RenameDialog'
import { BatchRenameDialog } from './components/BatchRenameDialog'
import { NewItemDialog } from './components/NewItemDialog'
import { ArchiveDialog } from './components/ArchiveDialog'
import { UnarchiveDialog } from './components/UnarchiveDialog'
import { Base64PreviewDialog } from './components/Base64PreviewDialog'

export const FileTableRowContextMenu = ({
  close,
  tableData,
  state,
}: {
  close: () => void
  tableData: DerivedDirectoryItem[]
  state:
    | {
        index: number
        item: DerivedDirectoryItem
      }
    | undefined
}) => {
  const pasteItem: ContextMenuItem = {
    onClick: () => {
      clipboardHelpers.paste(directoryId)
      close()
    },
    view: <TextWithIcon icon={ClipboardPasteIcon}>Paste</TextWithIcon>,
  }

  const newFileItem: ContextMenuItem = {
    onClick: () => {
      dialogActions.open({
        component: NewItemDialog,
        props: undefined,
      })
      close()
    },
    view: <TextWithIcon icon={FilePlusIcon}>New File or Folder</TextWithIcon>,
  }

  if (!state?.item || state.item.type === 'str') {
    const fileMenuItems: (ContextMenuItem | null)[] = [newFileItem, pasteItem]

    return <ContextMenuList items={fileMenuItems} />
  }

  const i = state.item
  const index = state.index
  const directoryId = useDirectoryContext().directoryId

  const item = i.item
  const fullPath = item.fullPath ?? directoryHelpers.getFullPath(item.name, directoryId)
  const isFavorite = selectIsFavorite(fullPath)(favoritesStore.get())
  const itemIndex = index

  const favoriteItem: ContextMenuItem = isFavorite
    ? {
        onClick: () => {
          favoritesStore.send({ type: 'removeFavorite', fullPath })
          close()
        },
        view: <TextWithIcon icon={StarOffIcon}>Remove from favorites</TextWithIcon>,
      }
    : {
        onClick: () => {
          favoritesStore.send({
            type: 'addFavorite',
            item: {
              fullPath,
              type: item.type,
            },
          })
          close()
        },
        view: <TextWithIcon icon={StarIcon}>Add to favorites</TextWithIcon>,
      }

  const snapshot = directoryStore.getSnapshot()
  const active = getActiveDirectory(snapshot.context, directoryId)
  const selection = getBufferSelection(snapshot.context, active)
  const selectionIndexes = selection.indexes
  const isSelected = itemIndex !== -1 && selectionIndexes.has(itemIndex)
  const sItems = (
    isSelected && selectionIndexes.size > 0 ? [...selectionIndexes].map(i => tableData[i]) : [item]
  ) as RealDirectoryItem[]
  const selectedItems = sItems.map(i => i.item)

  const copyItem: ContextMenuItem = {
    onClick: () => {
      clipboardHelpers.copy(selectedItems, false, directoryId)
      close()
    },
    view: (
      <TextWithIcon icon={CopyIcon}>
        Copy
        {isSelected && selectionIndexes.size > 1 ? ` (${selectionIndexes.size} items)` : ''}
      </TextWithIcon>
    ),
  }

  const cutItem: ContextMenuItem = {
    onClick: () => {
      clipboardHelpers.copy(selectedItems, true, directoryId)
      close()
    },
    view: (
      <TextWithIcon icon={ScissorsIcon}>
        Cut
        {isSelected && selectionIndexes.size > 1 ? ` (${selectionIndexes.size} items)` : ''}
      </TextWithIcon>
    ),
  }

  const deleteItem: ContextMenuItem = {
    onClick: () => {
      directoryHelpers.handleDelete(selectedItems, tableData, directoryId)
      close()
    },
    view: (
      <TextWithIcon icon={Trash2Icon}>
        Delete
        {isSelected && selectionIndexes.size > 1 ? ` (${selectionIndexes.size} items)` : ''}
      </TextWithIcon>
    ),
  }

  const renameItem: ContextMenuItem = {
    onClick: () => {
      dialogActions.open({
        component: RenameDialog,
        props: item,
      })
      close()
    },
    view: <TextWithIcon icon={PencilIcon}>Rename</TextWithIcon>,
  }

  const batchRenameItem: ContextMenuItem | null =
    isSelected && selectionIndexes.size > 1
      ? {
          onClick: () => {
            dialogActions.open({
              component: BatchRenameDialog,
              props: {
                items: selectedItems,
              },
            })
            close()
          },
          view: <TextWithIcon icon={PencilLineIcon}>Batch Rename ({selectionIndexes.size} items)</TextWithIcon>,
        }
      : null

  // Tag-related menu items
  const assignTagsItem: ContextMenuItem = {
    onClick: () => {
      directoryHelpers.openAssignTagsDialog(
        fullPath,
        (tableData as RealDirectoryItem[]).map(i => i.item),
        directoryId
      )
      close()
    },
    view: <TextWithIcon icon={TagIcon}>Assign Tags...</TextWithIcon>,
  }

  const copyPathItem: ContextMenuItem = {
    onClick: () => {
      navigator.clipboard.writeText(fullPath)
      toast.show({
        severity: 'success',
        message: 'Path copied to clipboard',
        customIcon: ClipboardCopyIcon,
      })
    },
    view: <TextWithIcon icon={ClipboardCopyIcon}>Copy Path</TextWithIcon>,
  }

  // Archive selected files/folders
  const archiveItem: ContextMenuItem = {
    onClick: () => {
      const filePaths = selectedItems.map(i => i.fullPath ?? directoryHelpers.getFullPath(i.name, directoryId))
      // If single item, suggest its name (without extension for files)
      let suggestedName: string | undefined
      if (selectedItems.length === 1) {
        const singleItem = selectedItems[0]
        if (singleItem.type === 'file') {
          // Remove extension
          suggestedName = singleItem.name.replace(/\.[^.]+$/, '')
        } else {
          // For folders, use the folder name
          suggestedName = singleItem.name
        }
      }
      dialogActions.open({
        component: ArchiveDialog,
        props: {
          filePaths,
          suggestedName,
        },
      })
      close()
    },
    view: (
      <TextWithIcon icon={FileArchiveIcon}>
        Create Archive
        {isSelected && selectionIndexes.size > 1 ? ` (${selectionIndexes.size} items)` : ''}
      </TextWithIcon>
    ),
  }

  const unarchiveMetadata = item.type === 'file' && ArchiveHelpers.getUnarchiveMetadata(fullPath)

  const unarchiveItem: ContextMenuItem | null = unarchiveMetadata
    ? {
        onClick: () => {
          dialogActions.open({
            component: UnarchiveDialog,
            props: {
              archiveFilePath: unarchiveMetadata.archiveFilePath,
              suggestedName: unarchiveMetadata.suggestedName,
              archiveType: unarchiveMetadata.archiveType,
            },
          })
          close()
        },
        view: <TextWithIcon icon={FolderInputIcon}>Extract Archive</TextWithIcon>,
      }
    : null

  // Last used tag quick-add item
  const lastUsedTag = useSelector(tagsStore, selectLastUsedTag)
  const hasLastUsedTag = lastUsedTag ? useSelector(tagsStore, selectHasTag(fullPath, lastUsedTag)) : false
  const lastUsedTagName = lastUsedTag ? useSelector(tagsStore, selectTagName(lastUsedTag)) : ''

  const lastUsedTagItem: ContextMenuItem | null =
    lastUsedTag && !hasLastUsedTag
      ? {
          onClick: () => {
            tagsStore.send({
              type: 'addTagToFiles',
              fullPaths: selectedItems.map(i => i.fullPath ?? directoryHelpers.getFullPath(i.name, directoryId)),
              color: lastUsedTag!,
            })

            close()
          },
          view: (
            <div className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${TAG_COLOR_CLASSES[lastUsedTag!].dot}`} />
              <span>Add to "{lastUsedTagName}"</span>
            </div>
          ),
        }
      : null

  // Open with Application menu item (only for files)
  const [applications, setApplications] = useState<ApplicationInfo[]>([])

  useEffect(() => {
    if (item.type === 'file') {
      getWindowElectron()
        .getApplicationsForFile(fullPath)
        .then(setApplications)
        .catch(() => setApplications([]))
    }
  }, [item.type, fullPath])

  const handleOpenWithApplication = async (app: ApplicationInfo) => {
    try {
      await getWindowElectron().openFileWithApplication(fullPath, app.path)
      const extensionMatch = item.name.match(/\.([^.]+)$/)
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : ''
      if (app.path !== '__choose__' && extension && !app.isDefault && !unarchiveMetadata) {
        const toastId = toast.show({
          severity: 'info',
          message: (
            <div className="flex items-center gap-2">
              <span>
                Set {app.name} as default for .{extension}?
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={async () => {
                  await getWindowElectron().setDefaultApplicationForExtension({
                    extension,
                    appPath: app.path,
                    appName: app.name,
                  })
                  if (toastId) {
                    toast.hide(toastId)
                  }
                  toast.show({
                    severity: 'success',
                    message: `Set ${app.name} as default for .${extension}`,
                  })
                }}
              >
                Set default
              </button>
            </div>
          ),
          timeout: Infinity,
          closeOnOutsideClick: true,
          location: 'bottom-right',
        })
      }
    } catch (err: any) {
      toast.show({
        severity: 'error',
        message: `Failed to open file: ${err?.message || 'Unknown error'}`,
      })
    }
    close()
  }

  const openWithApplicationItem: ContextMenuItem | null =
    item.type === 'file'
      ? {
          view: <TextWithIcon icon={ExternalLinkIcon}>Open With</TextWithIcon>,
          submenu: applications.map(app => {
            if (app.defaultSource === 'koda') {
              return {
                view: <div>{app.name} ⭐</div>,
                // view: (
                //   <div className="flex flex-col max-w-full" title={`${app.name}\n${app.path}`}>
                //     <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                //       {app.name} (Default (Koda))
                //     </span>
                //     <span className="text-xs opacity-70 overflow-hidden text-ellipsis whitespace-nowrap">{app.path}</span>
                //   </div>
                // ),
                submenu: [
                  {
                    onClick: () => handleOpenWithApplication(app),
                    view: 'Open with this app',
                  },
                  {
                    onClick: async () => {
                      const extensionMatch = item.name.match(/\.([^.]+)$/)
                      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : ''
                      if (!extension) return
                      await getWindowElectron().clearDefaultApplicationForExtension({ extension })
                      close()
                    },
                    view: 'Unset default',
                  },
                ],
              }
            }

            const defaultLabel = app.isDefault ? ' ⭐' : ''

            return {
              onClick: () => handleOpenWithApplication(app),
              view:
                app.path === '__choose__' ? (
                  <span>{app.name}</span>
                ) : (
                  <div className="flex flex-col max-w-full" title={`${app.name}\n${app.path}`}>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {app.name}
                      {defaultLabel}
                    </span>
                    <span className="text-xs opacity-70 overflow-hidden text-ellipsis whitespace-nowrap">
                      {app.path}
                    </span>
                  </div>
                ),
            }
          }),
        }
      : null

  const filteredCommands = windowArgs.commands?.filter(c => !c.glob || checkGlob(c.glob, fullPath))

  const inMenuCommands = filteredCommands?.filter(c => {
    return !c.menu || c.menu?.placement === 'menu'
  })

  if (inMenuCommands?.length) {
    inMenuCommands.sort((a, b) => (a.menu?.priority ?? 0) - (b.menu?.priority ?? 0))
  }

  const inlineCommands = filteredCommands?.filter(c => {
    return c.menu?.placement === 'inline'
  })

  if (inlineCommands?.length) {
    inlineCommands.sort((a, b) => (a.menu?.priority ?? 0) - (b.menu?.priority ?? 0))
  }

  const commandItem: ContextMenuItem | null = inMenuCommands?.length
    ? {
        view: <TextWithIcon icon={TerminalIcon}>Run Command</TextWithIcon>,
        submenu: inMenuCommands.map(script => ({
          onClick: () => CommandHelpers.runCommand(script, fullPath, item),
          view: script.name,
        })),
      }
    : null

  const inlineCommandItems = inlineCommands?.map(script => ({
    onClick: () => CommandHelpers.runCommand(script, fullPath, item),
    view: <TextWithIcon icon={TerminalIcon}>{script.name}</TextWithIcon>,
  }))

  const selectItem: ContextMenuItem | null = windowArgs.isSelectAppMode
    ? {
        view: <TextWithIcon icon={BoxSelectIcon}>Select</TextWithIcon>,
        onClick: () => getWindowElectron().sendSelectAppResult(fullPath),
      }
    : null

  // Copy as Base64 item for supported file types
  const copyAsBase64Item: ContextMenuItem | null =
    item.type === 'file' && supportsBase64Copy(item.name)
      ? {
          onClick: async () => {
            const result = await getWindowElectron().readFileAsBase64(fullPath)
            if (result.success) {
              const base64 = result.data.base64
              await navigator.clipboard.writeText(base64)
              toast.show({
                severity: 'success',
                message: (
                  <div className="flex items-center gap-2">
                    <span>Copied to clipboard</span>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        dialogActions.open({
                          component: Base64PreviewDialog,
                          props: { base64, fileName: item.name },
                        })
                      }}
                    >
                      <EyeIcon className="size-3" />
                      Show
                    </button>
                  </div>
                ),
                timeout: 8000,
              })
            } else {
              toast.show(result)
            }
            close()
          },
          view: <TextWithIcon icon={FileTextIcon}>Copy as Base64</TextWithIcon>,
        }
      : null

  if (item.type === 'dir') {
    const openDirectoryInNewTab: ContextMenuItem = {
      onClick: () => {
        directoryHelpers.openFolderInNewTab(item, directoryId)
      },
      view: <TextWithIcon icon={FolderPlusIcon}>Open in new tab</TextWithIcon>,
    }

    const loadDirectorySize: ContextMenuItem = {
      onClick: () => {
        directoryHelpers.loadDirectorySizes(directoryId, item.name)
        close()
      },
      view: <TextWithIcon icon={HardDriveIcon}>Calculate folder size</TextWithIcon>,
    }

    const directoryMenuItems: (ContextMenuItem | null)[] = [
      ...(inlineCommandItems || []),
      openDirectoryInNewTab,
      { isSeparator: true },
      {
        onClick: () => {
          setDefaultPath(fullPath)
          close()
        },
        view: <TextWithIcon icon={FolderCogIcon}>Set as default path</TextWithIcon>,
      },
      favoriteItem,
      lastUsedTagItem,
      assignTagsItem,
      { isSeparator: true },
      copyItem,
      cutItem,
      pasteItem,
      renameItem,
      batchRenameItem,
      deleteItem,
      { isSeparator: true },
      archiveItem,
      { isSeparator: true },
      newFileItem,
      { isSeparator: true },
      copyPathItem,
      loadDirectorySize,
      { isSeparator: true },
      commandItem,
      selectItem,
    ]

    return <ContextMenuList items={directoryMenuItems} />
  }

  const fileMenuItems: (ContextMenuItem | null)[] = [
    ...(inlineCommandItems || []),
    openWithApplicationItem,
    { isSeparator: true },
    favoriteItem,
    lastUsedTagItem,
    assignTagsItem,
    { isSeparator: true },
    copyItem,
    cutItem,
    pasteItem,
    deleteItem,
    renameItem,
    batchRenameItem,
    { isSeparator: true },
    archiveItem,
    unarchiveItem,
    { isSeparator: true },
    newFileItem,
    { isSeparator: true },
    copyPathItem,
    copyAsBase64Item,
    { isSeparator: true },
    commandItem,
    selectItem,
  ]

  return <ContextMenuList items={fileMenuItems} />
}
