import { execFile } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { GenericError, GenericResult } from '../../common/GenericError.js'
import { InstallAppResult, InstallAppTarget } from '../../common/Contracts.js'
import { Result } from '../../common/Result.js'
import { expandHome } from './expand-home.js'

const execFileAsync = promisify(execFile)

const elevatedCopyScript = `on run argv
  set sourcePath to item 1 of argv
  set destinationPath to item 2 of argv
  do shell script "/bin/test ! -e " & quoted form of destinationPath & " && /usr/bin/ditto " & quoted form of sourcePath & " " & quoted form of destinationPath with administrator privileges
end run`

export async function installApp(
  appPath: string,
  target: InstallAppTarget
): Promise<GenericResult<InstallAppResult>> {
  try {
    if (process.platform !== 'darwin') {
      return GenericError.Message('Installing app bundles is only supported on macOS')
    }

    const sourcePath = path.resolve(expandHome(appPath))
    if (!sourcePath.toLowerCase().endsWith('.app')) {
      return GenericError.Message('Only .app bundles can be installed')
    }

    const sourceStats = await fs.stat(sourcePath)
    if (!sourceStats.isDirectory()) {
      return GenericError.Message('The selected app bundle is not a folder')
    }

    const destinationDirectory = target === 'system' ? '/Applications' : path.join(os.homedir(), 'Applications')
    const destinationPath = path.join(destinationDirectory, path.basename(sourcePath))

    try {
      await fs.access(destinationPath)
      return GenericError.Message(`${path.basename(sourcePath)} is already installed in ${destinationDirectory}`)
    } catch {
      // The destination is available.
    }

    if (target === 'system') {
      try {
        await execFileAsync('/usr/bin/osascript', ['-e', elevatedCopyScript, sourcePath, destinationPath])
      } catch (error) {
        if (isAuthorizationCancellation(error)) {
          return Result.Success({ cancelled: true })
        }
        throw error
      }
    } else {
      await fs.mkdir(destinationDirectory, { recursive: true })
      await execFileAsync('/usr/bin/ditto', [sourcePath, destinationPath])
    }

    return Result.Success({ path: destinationPath, cancelled: false })
  } catch (error) {
    return GenericError.Message(error instanceof Error ? error.message : String(error))
  }
}

function isAuthorizationCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /user canceled|user cancelled|-128/i.test(error.message)
}
