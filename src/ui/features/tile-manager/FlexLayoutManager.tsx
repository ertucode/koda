import React, { useRef, ComponentProps, useEffect } from 'react'
import { Layout } from 'flexlayout-react'
import { BottomToolbar } from '../file-browser/components/BottomToolbar'
import { CustomTitleBar } from '../file-browser/components/CustomTitleBar'
import { DragRectangle } from '../file-browser/components/DragRectangle'
import { FileBrowserShortcuts } from '../file-browser/FileBrowserShortcuts'
import { layoutModel } from '../file-browser/initializeDirectory'
import { layoutFactory } from './layoutFactory'
import { onRenderTab } from './onRenderTab'
import { onRenderTabSet } from './onRenderTabSetFn'
import { useSyncDirectoryStoreAndLayout } from './useSyncDirectoryStoreAndLayout'
import { LayoutHelpers } from '../file-browser/utils/LayoutHelpers'
import { SettingsShortcuts } from '../file-browser/SettingsShortcuts'
import { VimShortcuts } from '../file-browser/vim/VimShortcuts'
import { WindowStoreShortcuts } from '../windowStore'
import { DialogStoreRenderer } from '../file-browser/dialogStore'

export const FlexLayoutManager: React.FC = () => {
  const layoutRef = useRef<Layout>(null)

  useEffect(() => {
    FileBrowserShortcuts.init()
    VimShortcuts.init()
    WindowStoreShortcuts.init()
    return () => {
      FileBrowserShortcuts.deinit()
      VimShortcuts.deinit()
      WindowStoreShortcuts.deinit()
    }
  })

  const { handleModelChange } = useSyncDirectoryStoreAndLayout({ layoutRef })

  return (
    <div className="flex flex-col items-stretch h-full overflow-hidden">
      <DialogStoreRenderer />
      <SettingsShortcuts />
      <CustomTitleBar />
      <div className="flex-1 min-w-0 min-h-0 relative">
        <Layout
          ref={layoutRef}
          model={layoutModel}
          factory={layoutFactory}
          onAction={layoutActionFn}
          onModelChange={handleModelChange}
          onRenderTab={onRenderTab}
          onRenderTabSet={onRenderTabSet}
        />
      </div>
      <BottomToolbar />
      <DragRectangle />
    </div>
  )
}

type LayoutActionFn = Exclude<ComponentProps<typeof Layout>['onAction'], undefined>
const layoutActionFn: LayoutActionFn = action => {
  const directories = LayoutHelpers.getDirectoryIds()
  if (action.type === 'FlexLayout_SetActiveTabset' && directories.length === 1) {
    return undefined
  }
  return action
}
