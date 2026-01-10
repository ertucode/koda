import { getWindowElectron, windowArgs } from '@/getWindowElectron'
import { AsyncStorageKey } from '@common/AsyncStorageKeys'
import { useState } from 'react'
import { ZodType } from 'zod'

export function useAsyncStorage<T>(
  key: AsyncStorageKey,
  schema: ZodType<T>,
  initialValue: NoInfer<T>,
  overrideValue?: $Maybe<NoInfer<T>>
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (overrideValue) return overrideValue
    try {
      const item = windowArgs.asyncStorage[key]
      return item ? schema.parse(JSON.parse(item)) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue(storedValue => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        getWindowElectron().setAsyncStorageValue(key, JSON.stringify(valueToStore))
        return valueToStore
      } catch (error) {
        console.error(error)
        return storedValue
      }
    })
  }

  return [storedValue, setValue] as const
}
