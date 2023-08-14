import { useEffect, useRef, useState } from 'react'
import { useExtStorage } from '@/common/hooks/useExtStorage'

// persist state to chrome.storage.session
export const useSessionState = <T>(initialState: T, key: string) => {
  const [state, setState] = useState<T>(initialState)

  const { data, update, isLoading } = useExtStorage<T>(key, {
    storageType: 'session',
  })

  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && data !== undefined) {
      setState(data)
      initialized.current = true
    }
  }, [data])

  useEffect(() => {
    update.mutate(state)
  }, [state])

  return [state, setState, isLoading] as const
}
