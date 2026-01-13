import { clsx } from '@/lib/functions/clsx'
import { TabNode, ITabRenderValues, Actions } from 'flexlayout-react'
import { FoldersIcon, TagIcon, XIcon, LoaderIcon, StarIcon, StarOffIcon, FolderCogIcon } from 'lucide-react'
import { layoutModel } from '../file-browser/initializeDirectory'
import { useSelector } from '@xstate/store/react'
import { directoryStore, selectDirectory } from '../file-browser/directoryStore/directory'
import { useDirectoryLoading } from '../file-browser/directoryStore/directoryLoadingStore'
import { TAG_COLOR_CLASSES } from '../file-browser/tags'
import { LayoutHelpers } from '../file-browser/utils/LayoutHelpers'
import { DirectoryId } from '../file-browser/directoryStore/DirectoryBase'
import { ContextMenu, ContextMenuItem, ContextMenuList, useContextMenu } from '@/lib/components/context-menu'
import { TextWithIcon } from '@/lib/components/text-with-icon'
import { favoritesStore, selectIsFavorite } from '../file-browser/favorites'
import { setDefaultPath } from '../file-browser/defaultPath'
import { dialogActions } from '../file-browser/dialogStore'
import { LayoutUtils } from '../file-browser/utils/LayoutUtils'
import { AssignTagsDialog } from '../file-browser/components/AssignTagsDialog'
import { useRef, useCallback } from 'react'
import { fileDragDropStore } from '../file-browser/fileDragDrop'

export const onRenderTab = (node: TabNode, renderValues: ITabRenderValues) => {
  const component = node.getComponent()
  const config = node.getConfig()

  const Icon = LayoutUtils.getIconForComponent(component)

  const isSelected = LayoutHelpers.isSelected(node)
  const isDirectory = LayoutHelpers.isDirectoryStupidTypescript(node)
  const noSiblings = !LayoutHelpers.hasSiblings(node)
  const parentIsActive = LayoutHelpers.parentIsActive(node)

  renderValues.content = isDirectory ? (
    <DirectoryTabContent
      node={node}
      directoryId={config.directoryId}
      isSelected={isSelected}
      parentIsActive={parentIsActive}
    />
  ) : (
    <div
      className={clsx(
        'cursor-move flex items-center gap-2 p-1 pl-2 h-full text-xs',
        node.isSelected() && !noSiblings && 'shadow-[inset_0_-3px_0_0_var(--color-primary)]',
        !noSiblings && 'px-2'
      )}
    >
      <Icon className="size-4" />
      {noSiblings && node.getName()}
    </div>
  )

  // Disable close button
  if (node.isEnableClose()) {
    renderValues.buttons = []
  }
}

// Delay before switching to a tab when dragging files over it (ms)
const TAB_SWITCH_DELAY = 100

// Helper to check if there's an active file drag from our app
const hasActiveFileDrag = (): boolean => {
  const activeDrag = fileDragDropStore.getSnapshot().context.activeDrag
  return activeDrag !== null
}

function DirectoryTabContent({
  node,
  directoryId,
  isSelected,
  parentIsActive,
}: {
  node: TabNode
  directoryId: DirectoryId
  isSelected: boolean
  parentIsActive: boolean
}) {
  const contextMenu = useContextMenu<DirectoryId>()
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      // Only respond to our app's file drags (check store state)
      if (!hasActiveFileDrag()) {
        return
      }

      e.preventDefault()
      // Don't stopPropagation - flexlayout needs events for tab reordering

      // If this tab is already selected, no need to switch
      if (isSelected) {
        clearHoverTimer()
        return
      }

      // Start timer to switch to this tab if not already running
      if (!hoverTimerRef.current) {
        hoverTimerRef.current = setTimeout(() => {
          layoutModel.doAction(Actions.selectTab(node.getId()))
          hoverTimerRef.current = null
        }, TAB_SWITCH_DELAY)
      }
    },
    [node, directoryId, isSelected, clearHoverTimer]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only respond to our app's file drags
    if (!hasActiveFileDrag()) {
      return
    }
    e.preventDefault()
    // Don't stopPropagation - flexlayout needs events for tab reordering
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Only clear timer if actually leaving this element (not entering a child)
      const relatedTarget = e.relatedTarget as Node | null
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
        return
      }
      clearHoverTimer()
    },
    [clearHoverTimer]
  )

  const handleDrop = useCallback(() => {
    // Let the drop propagate to the file browser, but clear our timer
    clearHoverTimer()
  }, [clearHoverTimer])

  return (
    <>
      <div
        className={clsx(
          'cursor-move flex items-center gap-3 h-full p-2',
          isSelected && 'shadow-[inset_0_-3px_0_0_var(--color-primary)]',
          (!parentIsActive || !isSelected) && 'opacity-60',
          'dir-marker'
        )}
        onContextMenu={e => contextMenu.onRightClick(e, directoryId)}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DirectoryIcon directoryId={directoryId} />
        <DirectoryTabLabel directoryId={directoryId} />
        <div
          key={`close-${node.getId()}`}
          className="cursor-pointer flex items-center gap-3 h-full"
          title="Close"
          onClick={e => {
            e.stopPropagation()
            layoutModel.doAction(Actions.deleteTab(node.getId()))
          }}
        >
          <XIcon className="size-4" />
        </div>
      </div>
      {contextMenu.isOpen && contextMenu.item && (
        <ContextMenu menu={contextMenu}>
          <DirectoryTabContextMenu directoryId={contextMenu.item} close={contextMenu.close} />
        </ContextMenu>
      )}
    </>
  )
}

function DirectoryIcon({ directoryId }: { directoryId: DirectoryId }) {
  const isLoading = useDirectoryLoading(directoryId)
  return isLoading ? <LoaderIcon className="size-4 animate-spin" /> : <FoldersIcon className="size-4" />
}

function DirectoryTabLabel({ directoryId }: { directoryId: DirectoryId }) {
  const directory = useSelector(directoryStore, selectDirectory(directoryId))

  if (directory.type !== 'path')
    return <div className={clsx('size-3 min-w-3 rounded-full flex-shrink-0', TAG_COLOR_CLASSES[directory.color].dot)} />

  return (
    <>
      <span className="text-xs truncate max-w-[200px]">{directory.fullPath}</span>
    </>
  )
}

function DirectoryTabContextMenu({ directoryId, close }: { directoryId: DirectoryId; close: () => void }) {
  const directory = useSelector(directoryStore, selectDirectory(directoryId))

  // Only show context menu for path-type directories
  if (directory.type !== 'path') {
    return null
  }

  const fullPath = directory.fullPath
  const isFavorite = selectIsFavorite(fullPath)(favoritesStore.get())

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
              type: 'dir',
            },
          })
          close()
        },
        view: <TextWithIcon icon={StarIcon}>Add to favorites</TextWithIcon>,
      }

  const assignTagsItem: ContextMenuItem = {
    onClick: () => {
      dialogActions.open({
        component: AssignTagsDialog,
        props: { fullPath },
      })
      close()
    },
    view: <TextWithIcon icon={TagIcon}>Assign Tags...</TextWithIcon>,
  }

  const setDefaultPathItem: ContextMenuItem = {
    onClick: () => {
      setDefaultPath(fullPath)
      close()
    },
    view: <TextWithIcon icon={FolderCogIcon}>Set as default path</TextWithIcon>,
  }

  return <ContextMenuList items={[setDefaultPathItem, favoriteItem, assignTagsItem]} />
}
