import electron from 'electron'
import {
  EventRequestMapping,
  EventResponseMapping,
  StringSearchOptions,
  WindowElectron,
  PathFinderOptions,
} from '../common/Contracts'
import { ArchiveTypes } from '../common/ArchiveTypes'

electron.contextBridge.exposeInMainWorld('electron', {
  getFilePath: (file: File) => electron.webUtils.getPathForFile(file),
  convertDocxToPdf: (file: File) => ipcInvoke('docxToPdf', electron.webUtils.getPathForFile(file)),
  convertDocxToPdfByPath: (filePath: string) => ipcInvoke('docxToPdf', filePath),
  getFilesAndFoldersInDirectory: (directory: string) => ipcInvoke('getFilesAndFoldersInDirectory', directory),
  openFile: (filePath: string) => ipcInvoke('openFile', filePath),
  onDragStart: req => ipcInvoke('onDragStart', req),
  getWindowArgs: () => {
    return getArgv('--window-args=')!
  },
  readFilePreview: (filePath: string, allowBigSize?: boolean) =>
    ipcInvoke('readFilePreview', { filePath, allowBigSize }),
  createFileOrFolder: (parentDir: string, name: string) => ipcInvoke('createFileOrFolder', { parentDir, name }),
  renameFileOrFolder: (fullPath: string, newName: string) => ipcInvoke('renameFileOrFolder', { fullPath, newName }),
  getPreviewPreloadPath: () => ipcInvoke('getPreviewPreloadPath', undefined),
  getStartingDirectory: () => getArgv('--initial-path='),
  copyFiles: (filePaths: string[], cut: boolean) => ipcInvoke('copyFiles', { filePaths, cut }),
  fuzzyPathFinder: (directory: string, query: string, options: PathFinderOptions) =>
    ipcInvoke('fuzzyPathFinder', { directory, query, options }),
  searchStringRecursively: (options: StringSearchOptions) => ipcInvoke('searchStringRecursively', options),
  readArchiveContents: (archivePath: string, archiveType: ArchiveTypes.ArchiveType) =>
    ipcInvoke('readArchiveContents', { archivePath, archiveType }),
  getAudioMetadata: (filePath: string) => ipcInvoke('getAudioMetadata', filePath),
} satisfies Partial<WindowElectron>)

function getArgv(key: string) {
  const arg = process.argv.find(x => x.startsWith(key))
  const staticData = arg ? arg.replace(key, '') : null
  return staticData
}

function ipcInvoke<Key extends keyof EventResponseMapping>(
  key: Key,
  request: Key extends keyof EventRequestMapping ? EventRequestMapping[Key] : void
) {
  return electron.ipcRenderer.invoke(key, request)
}

function ipcOn<Key extends keyof EventResponseMapping>(
  key: Key,
  callback: (payload: EventResponseMapping[Key]) => void
) {
  const cb = (_: Electron.IpcRendererEvent, payload: EventResponseMapping[Key]) => {
    callback(payload)
  }
  electron.ipcRenderer.on(key, cb)

  return () => {
    electron.ipcRenderer.off(key, cb)
  }
}

electron.ipcRenderer.on('message-to-preview', (_event, payload) => {
  window.postMessage({ type: payload.type, payload: payload.payload }, '*')
})
