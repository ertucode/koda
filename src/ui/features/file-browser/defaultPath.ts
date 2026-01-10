import { getWindowElectron } from '@/getWindowElectron'
import z from 'zod'
import { createAsyncStoragePersistence } from './utils/asyncStorage'
import { DirectoryInfo } from './directoryStore/DirectoryBase'
import { AsyncStorageKeys } from '@common/AsyncStorageKeys'

const startingDirectory = getWindowElectron().getStartingDirectory()

const defaultPathPersistence = createAsyncStoragePersistence(AsyncStorageKeys.defaultPath, z.string())

export let defaultPath = startingDirectory ?? defaultPathPersistence.load('~/')

function getDirectoryInfo(dir: string): Extract<DirectoryInfo, { type: 'path' }> {
  const idx = dir.indexOf('/')
  if (idx === -1) throw new Error('Invalid directory name')
  return { type: 'path', fullPath: dir }
}
export const initialDirectoryInfo = getDirectoryInfo(defaultPath)

export function setDefaultPath(path: string) {
  defaultPath = path
  defaultPathPersistence.save(path)
}
