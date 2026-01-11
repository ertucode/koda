import { IJsonModel, Model } from 'flexlayout-react'
import { defaultPath } from './defaultPath'
import { directoryStore } from './directoryStore/directory'
import { DirectoryId } from './directoryStore/DirectoryBase'
import { CustomLayout, CustomLayoutSchema, layoutStore, layoutStoreHelpers, selectDefaultLayout } from './layoutStore'
import { windowArgs } from '@/getWindowElectron'
import { saveToAsyncStorage } from './utils/asyncStorage'
import { AsyncStorageKeys } from '@common/AsyncStorageKeys'
import z from 'zod'

const isSelectAppMode = windowArgs.isSelectAppMode

type InitDirectories = Parameters<typeof directoryStore.trigger.initDirectories>[0]['directories']
function init(directories: InitDirectories, activeDirectoryId: string, layoutJson: IJsonModel) {
  directoryStore.trigger.initDirectories({
    directories: directories,
    activeDirectoryId: activeDirectoryId,
  })

  return layoutJson
}

function initFromPaths(paths: string[]) {
  const directoriesToInit: Parameters<typeof directoryStore.trigger.initDirectories>[0]['directories'] = paths.map(
    p => {
      return {
        fullPath: p,
        type: 'path',
        id: Math.random().toString(36).slice(2) as DirectoryId,
      }
    }
  )

  return init(directoriesToInit, directoriesToInit[0].id, createDefaultLayout(directoriesToInit))
}
export namespace LayoutDevMode {
  const KEY = '__dirs__'
  export function getInitial(): CustomLayout | undefined {
    if (!windowArgs.isDev) return

    window.addEventListener('keydown', e => {
      if (e.key === 'r' && e.metaKey && e.ctrlKey) {
        sessionStorage.removeItem(KEY)
        location.reload()
      }
    })

    try {
      const l = sessionStorage.getItem(KEY)
      if (!l) return
      return CustomLayoutSchema.parse(JSON.parse(l))
    } catch {
      return undefined
    }
  }

  export function onLayoutChange(layoutJson: IJsonModel) {
    if (!windowArgs.isDev) return

    const snapshot = directoryStore.getSnapshot()
    const directories = snapshot.context.directoryOrder.map(id => {
      const directory = snapshot.context.directoriesById[id]
      return {
        id,
        ...directory.directory,
      }
    })
    const activeDirectoryId = snapshot.context.activeDirectoryId

    const layout: CustomLayout = layoutStoreHelpers.createLayout(
      Math.random().toString(),
      layoutJson,
      directories,
      activeDirectoryId
    )
    sessionStorage.setItem(KEY, JSON.stringify(layout))
  }
}

function createDefaultLayout(directories: InitDirectories) {
  const directoryTabs = directories.map((dir, index) => ({
    type: 'tab' as const,
    name: `Directory ${index + 1}`,
    component: 'directory',
    config: { directoryId: dir.id },
    enableClose: true,
  }))

  return {
    global: {
      tabEnableClose: true,
      tabEnableRename: false,
      tabEnableDrag: true,
      tabSetEnableMaximize: false,
      tabSetEnableTabStrip: true,
      tabSetEnableDrop: true,
      tabSetEnableDrag: true,
      tabSetEnableDivide: true,
      tabSetEnableClose: false,
      borderEnableDrop: true,
      splitterSize: 2,
    },
    borders: [],
    layout: {
      type: 'row',
      weight: 100,
      children: [
        // Left sidebar column - vertical split with favorites, recents, tags
        {
          type: 'row',
          weight: 10,
          children: [
            {
              type: 'tabset',
              weight: 33,
              selected: 0,
              enableTabStrip: true,
              children: [
                {
                  type: 'tab',
                  name: 'FAVORITES',
                  component: 'favorites',
                  enableClose: false,
                },
              ],
            },
            {
              type: 'tabset',
              weight: 33,
              selected: 0,
              enableTabStrip: true,
              children: [
                {
                  type: 'tab',
                  name: 'RECENTS',
                  component: 'recents',
                  enableClose: false,
                },
              ],
            },
            {
              type: 'tabset',
              weight: 34,
              selected: 0,
              enableTabStrip: true,
              children: [
                {
                  type: 'tab',
                  name: 'TAGS',
                  component: 'tags',
                  enableClose: false,
                },
              ],
            },
          ],
        },
        // Middle: Options at top, directories below
        {
          type: 'row',
          weight: 80,
          children: [
            {
              type: 'tabset',
              weight: 96,
              selected: 0,
              enableTabStrip: true,
              children:
                directoryTabs.length > 0
                  ? directoryTabs
                  : [
                      {
                        type: 'tab',
                        name: 'No Directories',
                        component: 'placeholder',
                      },
                    ],
            },
          ],
        },
        // Right preview section
        {
          type: 'tabset',
          weight: 15,
          selected: 0,
          enableTabStrip: true,
          children: [
            {
              type: 'tab',
              name: 'PREVIEW',
              component: 'preview',
              enableClose: false,
            },
          ],
        },
      ],
    },
  }
}

export const layoutJson = ((): IJsonModel => {
  if (isSelectAppMode && windowArgs.initialPath) {
    return initFromPaths([windowArgs.initialPath])
  }
  // First, check if there's an applied layout in asyncStorage (from CustomLayoutsDialog)
  const appliedLayoutStr = windowArgs.asyncStorage.oneTimeLayoutModel
  if (appliedLayoutStr) {
    try {
      const appliedLayout = JSON.parse(appliedLayoutStr)
      if (appliedLayout.layout && appliedLayout.directories) {
        directoryStore.trigger.initDirectories({
          directories: appliedLayout.directories,
          activeDirectoryId: appliedLayout.activeDirectoryId || appliedLayout.directories[0]?.id,
        })
        // Clear the applied layout after loading it once
        saveToAsyncStorage(AsyncStorageKeys.oneTimeLayoutModel, z.null(), null)
        return appliedLayout.layout
      }
    } catch (error) {
      console.error('Failed to load applied layout:', error)
      // Clear corrupted data
      saveToAsyncStorage(AsyncStorageKeys.oneTimeLayoutModel, z.null(), null)
    }
  }

  // Otherwise, use the default layout from layoutStore
  const layoutStoreState = layoutStore.get()
  const defaultLayout = selectDefaultLayout(layoutStoreState)
  const layoutToUse = LayoutDevMode.getInitial() || defaultLayout || layoutStoreState.context.layouts[0]

  // If we have a saved layout with directories, use it
  if (layoutToUse) {
    return init(layoutToUse.directories, layoutToUse.activeDirectoryId, layoutToUse.layoutJson)
  }

  return initFromPaths(['~/Downloads', defaultPath])
})()

export const layoutModel = Model.fromJson(layoutJson)
