/**
 * Cache for directory sizes keyed by fullPath and modifiedTimestamp.
 * This allows us to preserve directory size information when navigating
 * between folders without losing the computed sizes.
 */

type CacheKey = string

export interface CachedSize {
  size: number
  sizeStr: string
  modifiedTimestamp: number
}

export type KnownDirectorySize = {
  name: string
  modifiedTimestamp: number
  size: number
}

// Map of fullPath -> size info (including modifiedTimestamp for validation)
const sizeCache = new Map<CacheKey, CachedSize>()

export const directorySizeCache = {
  /**
   * Get cached size for a directory (only if modifiedTimestamp matches)
   */
  get(fullPath: string, modifiedTimestamp: number | undefined | null): CachedSize | undefined {
    if (!fullPath || modifiedTimestamp == null) return undefined
    const cached = sizeCache.get(fullPath)
    if (cached && cached.modifiedTimestamp === modifiedTimestamp) {
      return cached
    }
    return undefined
  },

  /**
   * Get raw cached entry (without timestamp validation) - useful for building knownSizes
   */
  getRaw(fullPath: string): CachedSize | undefined {
    return sizeCache.get(fullPath)
  },

  /**
   * Set cached size for a directory
   */
  set(fullPath: string, modifiedTimestamp: number | undefined | null, size: number, sizeStr: string): void {
    if (!fullPath || modifiedTimestamp == null) return
    sizeCache.set(fullPath, { size, sizeStr, modifiedTimestamp })
  },

  /**
   * Clear all cached sizes
   */
  clear(): void {
    sizeCache.clear()
  },

  /**
   * Get the current cache size (for debugging)
   */
  size(): number {
    return sizeCache.size
  },
}
