import { useCallback, useMemo, useState } from 'react'
import { LocalStorageService } from '@/common/storage/LocalStorageService'

/**
 * React hook that backs useState with localStorage persistence.
 * Reads the initial value from localStorage and writes back on every update.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const service = useMemo(() => new LocalStorageService<T>(key), [key])

  const [value, setValue] = useState<T>(() => {
    return service.read() ?? defaultValue
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      service.write(next)
    },
    [service]
  )

  return [value, update] as const
}
