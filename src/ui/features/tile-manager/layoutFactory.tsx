import { TabNode } from 'flexlayout-react'
import { DirectoryTablePane } from '../file-browser/components/DirectoryTablePane'
import { FavoritesList } from '../file-browser/components/FavoritesList'
import { FileBrowserOptionsSection } from '../file-browser/components/FileBrowserOptionsSection'
import { RecentsList } from '../file-browser/components/RecentsList'
import { TagsList } from '../file-browser/components/TagsList'
import { useSelector } from '@xstate/store/react'
import { FilePreview } from '../file-browser/components/FilePreview'
import { directoryStore, directoryHelpers, selectCursorLine } from '../file-browser/directoryStore/directory'
import { directoryDerivedStores } from '../file-browser/directoryStore/directorySubscriptions'

const paneClassName = 'w-full h-full flex flex-col overflow-auto'
export const layoutFactory = (node: TabNode) => {
  const component = node.getComponent()
  const config = node.getConfig()

  switch (component) {
    case 'favorites':
      return (
        <div className={paneClassName}>
          <FavoritesList />
        </div>
      )
    case 'recents':
      return (
        <div className={paneClassName}>
          <RecentsList />
        </div>
      )
    case 'tags':
      return (
        <div className={paneClassName}>
          <TagsList />
        </div>
      )
    case 'options':
      return (
        <div className={paneClassName}>
          <FileBrowserOptionsSection />
        </div>
      )
    case 'preview':
      return (
        <div className={paneClassName}>
          <FileBrowserFilePreview />
        </div>
      )
    case 'directory':
      return (
        <div className={paneClassName}>
          <DirectoryTablePane directoryId={config?.directoryId} />
        </div>
      )
    default:
      return <div className={paneClassName}>Unknown Component: {component}</div>
  }
}

function FileBrowserFilePreview() {
  const activeDirectoryId = useSelector(directoryStore, s => s.context.activeDirectoryId)
  const cursorLine = useSelector(directoryStore, selectCursorLine(activeDirectoryId))
  const filteredDirectoryData = directoryDerivedStores.get(activeDirectoryId)?.useFilteredDirectoryData()

  // Get selected file for preview (only if exactly one file is selected)
  const sItem = filteredDirectoryData && cursorLine != null ? filteredDirectoryData[cursorLine] : null
  const selectedItem = sItem?.type === 'real' ? sItem.item : null
  const previewFilePath = selectedItem
    ? (selectedItem.fullPath ?? directoryHelpers.getFullPath(selectedItem.name, activeDirectoryId))
    : null

  return (
    <FilePreview
      filePath={previewFilePath}
      isFile={selectedItem?.type === 'file'}
      fileSize={selectedItem?.size}
      fileExt={selectedItem?.type === 'file' ? selectedItem.ext : null}
      isResizing={false}
    />
  )
}
