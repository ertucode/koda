import { getWindowElectron, windowArgs } from '@/getWindowElectron'
import { directoryHelpers } from './file-browser/directoryStore/directoryHelpers'
import { PathHelpers } from '@common/PathHelpers'

export function subscribeToGenericEvents() {
  getWindowElectron().onGenericEvent(e => {
    if (e.type === 'reload-path') {
      directoryHelpers.checkAndReloadDirectories(
        PathHelpers.expandHome(windowArgs.homeDir, e.path),
        e.fileToSelect && PathHelpers.name(e.fileToSelect)
      )
    } else {
      const _exhaustiveCheck: never = e?.type
      return _exhaustiveCheck
    }
  })
}
