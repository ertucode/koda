import { getWindowElectron, windowArgs } from '@/getWindowElectron'
import { AsyncStorageKey } from '@common/AsyncStorageKeys'
import { z } from 'zod'

/**
 * Load data from asyncStorage with schema validation
 * @param key - key
 * @param schema - Zod schema for validation
 * @param defaultValue - Default value if loading fails
 * @returns Validated data or default value
 */
export const loadFromAsyncStorage = <T>(key: AsyncStorageKey, schema: z.ZodType<T>, defaultValue: T): T => {
  try {
    const item = windowArgs.asyncStorage[key]
    if (!item) return defaultValue
    const parsed = JSON.parse(item)
    return schema.parse(parsed)
  } catch {
    return defaultValue
  }
}

/**
 * Save data to asyncStorage with schema validation
 * @param key - key
 * @param schema - Zod schema for validation
 * @param value - Value to save
 */
export const saveToAsyncStorage = async <T>(key: AsyncStorageKey, schema: z.ZodType<T>, value: T): Promise<void> => {
  try {
    const validated = schema.parse(value)
    await getWindowElectron().setAsyncStorageValue(key, typeof value === 'string' ? value : JSON.stringify(validated))
  } catch {
    // Ignore validation errors
  }
}

/**
 * Create a asyncStorage persistence helper for xstate stores
 * @param key - key
 * @param schema - Zod schema for validation
 * @returns Object with load and save functions
 */
export const createAsyncStoragePersistence = <T>(key: AsyncStorageKey, schema: z.ZodType<T>) => ({
  load: (defaultValue: T) => loadFromAsyncStorage(key, schema, defaultValue),
  save: (value: T) => saveToAsyncStorage(key, schema, value),
})
