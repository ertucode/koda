const DATABASE_NAME = 'koda-video-thumbnails'
const STORE_NAME = 'thumbnails'
const MAX_ENTRIES = 100

type ThumbnailCacheEntry = {
  fullPath: string
  modifiedTimestamp: number
  data: string
  lastAccessed: number
}

const pendingThumbnails = new Map<string, Promise<string>>()

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1)

  request.onupgradeneeded = () => {
    const database = request.result
    const store = database.createObjectStore(STORE_NAME, { keyPath: 'fullPath' })
    store.createIndex('lastAccessed', 'lastAccessed')
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

async function getEntry(fullPath: string): Promise<ThumbnailCacheEntry | undefined> {
  const database = await databasePromise
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const entry = await requestResult(
    transaction.objectStore(STORE_NAME).get(fullPath) as IDBRequest<ThumbnailCacheEntry | undefined>
  )
  await transactionComplete(transaction)
  return entry
}

async function deleteEntry(fullPath: string): Promise<void> {
  const database = await databasePromise
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).delete(fullPath)
  await transactionComplete(transaction)
}

async function trimCache(): Promise<void> {
  const database = await databasePromise
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const entriesRequest = store.index('lastAccessed').getAll()

  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result as ThumbnailCacheEntry[]
    entries.slice(0, Math.max(0, entries.length - MAX_ENTRIES)).forEach(entry => store.delete(entry.fullPath))
  }

  await transactionComplete(transaction)
}

async function setEntry(entry: ThumbnailCacheEntry): Promise<void> {
  const database = await databasePromise
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(entry)
  await transactionComplete(transaction)
  await trimCache()
}

export const videoThumbnailCache = {
  async getOrGenerate(
    fullPath: string,
    modifiedTimestamp: number | null | undefined,
    generate: () => Promise<string>
  ): Promise<string> {
    if (modifiedTimestamp == null) return generate()

    const cacheKey = `${fullPath}:${modifiedTimestamp}`
    const pending = pendingThumbnails.get(cacheKey)
    if (pending) return pending

    const promise = (async () => {
      try {
        const cached = await getEntry(fullPath)
        if (cached?.modifiedTimestamp === modifiedTimestamp) {
          await setEntry({ ...cached, lastAccessed: Date.now() })
          return cached.data
        }
        if (cached) await deleteEntry(fullPath)
      } catch (error) {
        console.error('Failed to read the video thumbnail cache:', error)
      }

      const data = await generate()
      try {
        await setEntry({ fullPath, modifiedTimestamp, data, lastAccessed: Date.now() })
      } catch (error) {
        console.error('Failed to persist the video thumbnail cache:', error)
      }
      return data
    })()

    pendingThumbnails.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      pendingThumbnails.delete(cacheKey)
    }
  },
}
