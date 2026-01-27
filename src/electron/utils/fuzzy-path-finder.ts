import { spawn } from 'child_process'
import os from 'os'
import { expandHome } from './expand-home.js'
import { GenericError, GenericResult } from '../../common/GenericError.js'
import { Result } from '../../common/Result.js'
import { fdPath } from './get-vendor-path.js'
import { errorToString } from '../../common/errorToString.js'
import { fuzzyPerformant } from './fuzzy-performant.js'
import { PathFinderOptions, PathFinderResult } from '../../common/Contracts.js'

type CachedDirectory = {
  path: string
  optionsKey: string
  items: PathFinderResult[]
  timestamp: number
}

type PendingRequest = {
  directory: string
  optionsKey: string
  promise: Promise<GenericResult<PathFinderResult[]>>
  abortController: AbortController
}

const CACHE_DURATION_MS = 5000 // 5 seconds

let cachedDirectory: CachedDirectory | null = null
let pendingRequest: PendingRequest | null = null

function getOptionsKey(options: PathFinderOptions): string {
  return JSON.stringify({
    type: options.type,
    maxDepth: options.maxDepth,
    respectGitIgnore: options.respectGitIgnore,
    ignoreHidden: options.ignoreHidden,
    ignoreVcs: options.ignoreVcs,
    extensions: options.extensions?.sort() ?? [],
    excludePatterns: options.excludePatterns?.sort() ?? [],
  })
}

export async function fuzzyPathFinder(
  directory: string,
  query: string,
  options: PathFinderOptions
): Promise<GenericResult<PathFinderResult[]>> {
  const optionsKey = getOptionsKey(options)

  // If there's a pending request for a different directory/options, cancel it
  if (pendingRequest && (pendingRequest.directory !== directory || pendingRequest.optionsKey !== optionsKey)) {
    pendingRequest.abortController.abort()
    pendingRequest = null
  }

  // If there's a pending request for the same directory/options, wait for it
  if (pendingRequest && pendingRequest.directory === directory && pendingRequest.optionsKey === optionsKey) {
    try {
      await pendingRequest.promise
    } catch (error) {
      // Ignore errors from aborted requests
      if ((error as Error).name === 'AbortError') {
        // Request was aborted, continue with current request
      }
    }
  }

  // Load items if directory/options changed, not cached, or cache expired
  const now = Date.now()
  const isCacheExpired = cachedDirectory && now - cachedDirectory.timestamp > CACHE_DURATION_MS

  if (
    !cachedDirectory ||
    cachedDirectory.path !== directory ||
    cachedDirectory.optionsKey !== optionsKey ||
    isCacheExpired
  ) {
    const abortController = new AbortController()
    const promise = listPathsRecursively(directory, options, abortController.signal)

    pendingRequest = {
      directory,
      optionsKey,
      promise,
      abortController,
    }

    try {
      const result = await promise

      // Clear pending request only if it's still ours
      if (pendingRequest?.directory === directory && pendingRequest?.optionsKey === optionsKey) {
        pendingRequest = null
      }

      if (!result.success) {
        return result
      }
      cachedDirectory = {
        path: directory,
        optionsKey,
        items: result.data,
        timestamp: Date.now(),
      }
    } catch (error) {
      // Clear pending request on error
      if (pendingRequest?.directory === directory && pendingRequest?.optionsKey === optionsKey) {
        pendingRequest = null
      }

      // Re-throw abort errors to be handled by caller
      if ((error as Error).message === 'AbortError') {
        throw error
      }

      return GenericError.Unknown(error)
    }
  }

  // If no query, return first 100 items
  if (!query.trim()) {
    return Result.Success(cachedDirectory.items.slice(0, 100))
  }

  // Perform fuzzy search on paths only
  const paths = cachedDirectory.items.map(item => item.path)
  const result = await fuzzyPerformant(paths, query)
  if (!result.success) {
    return result
  }

  // Map filtered paths back to PathFinderResult with type information
  const pathToItem = new Map(cachedDirectory.items.map(item => [item.path, item]))
  const filteredItems = result.data
    .map(path => pathToItem.get(path))
    .filter((item): item is PathFinderResult => item !== undefined)

  // Return top 100 results
  return Result.Success(filteredItems.slice(0, 100))
}

function listPathsRecursively(
  target: string,
  options: PathFinderOptions,
  signal?: AbortSignal
): Promise<GenericResult<PathFinderResult[]>> {
  return new Promise<GenericResult<PathFinderResult[]>>((resolve, reject) => {
    const expandedTarget = expandHome(target)
    const isHomeDir = expandedTarget === os.homedir()

    const args: string[] = []

    // Type filter
    if (options.type === 'file') {
      args.push('--type', 'f')
    } else if (options.type === 'folder') {
      args.push('--type', 'd')
    }
    // For 'all', don't specify --type to get both files and directories

    // Follow symlinks
    args.push('--follow')

    // Max depth
    if (options.maxDepth > 0) {
      args.push('--max-depth', String(options.maxDepth))
    }

    // Hidden files
    if (!options.ignoreHidden) {
      args.push('--hidden')
    }

    // Git ignore
    if (!options.respectGitIgnore) {
      args.push('--no-ignore')
    }

    // VCS directories (.git)
    if (options.ignoreVcs) {
      args.push('--exclude', '.git')
    }

    // Extensions filter
    if (options.extensions && options.extensions.length > 0) {
      const extensions = new Set(options.extensions)
      for (const ext of extensions) {
        // Remove leading dot if present
        const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext
        args.push('--extension', cleanExt)
      }
    }

    // Exclude patterns
    if (options.excludePatterns && options.excludePatterns.length > 0) {
      const patterns = new Set(options.excludePatterns)
      for (const pattern of patterns) {
        args.push('--exclude', pattern)
      }
    }

    // Only exclude Library and Trash when searching from home directory
    if (isHomeDir) {
      args.push('--exclude', 'Library', '--exclude', '.Trash')
    }

    // Search pattern and path
    args.push('.', '.')

    console.log(fdPath, args.map(a => `'${a}'`).join(' '))
    const child = spawn(fdPath, args, {
      cwd: expandedTarget,
    })

    // Handle abort signal
    if (signal) {
      const onAbort = () => {
        child.kill('SIGTERM')
        reject(new Error('AbortError'))
      }

      if (signal.aborted) {
        onAbort()
        return
      }

      signal.addEventListener('abort', onAbort, { once: true })

      child.on('close', () => {
        signal.removeEventListener('abort', onAbort)
      })
    }

    let output = ''

    child.stdout.on('data', chunk => {
      output += chunk.toString()
    })

    child.stderr.on('data', chunk => {
      console.error('fd stderr:', chunk.toString())
    })

    child.on('error', err => {
      console.error(err)
      resolve(GenericError.Message(errorToString(err)))
    })

    child.on('close', code => {
      // fd exits with code 1 when no matches found, which is not an error
      if (code !== 0 && code !== 1) {
        return resolve(GenericError.Unknown(`fd exited with ${code}`))
      }

      const lines = output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Remove leading "./" if present
          if (line.startsWith('./')) {
            return line.slice(2)
          }
          return line
        })

      // Parse each line to determine if it's a file or folder
      // fd outputs directories with trailing slash when using no --type filter
      const items: PathFinderResult[] = lines.map(line => {
        const isFolder = line.endsWith('/')
        const path = isFolder ? line.slice(0, -1) : line

        // Determine type based on the original filter or the trailing slash
        let type: 'file' | 'folder'
        if (options.type === 'file') {
          type = 'file'
        } else if (options.type === 'folder') {
          type = 'folder'
        } else {
          type = isFolder ? 'folder' : 'file'
        }

        return { path, type }
      })

      resolve(Result.Success(items))
    })
  })
}
