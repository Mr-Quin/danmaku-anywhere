import { useCallback, useEffect, useRef, useState } from 'react'
import { useExtStorage } from '@/common/hooks/useExtStorage'

// persist state to chrome.storage.session
export const useSessionState = <T>(initialState: T, key: string) => {
  const isInit = useRef(true)
  const {
    data,
    isLoading,
    isInit: isInitState,
    setData,
  } = useExtStorage<T>(key, {
    storageType: 'session',
    sync: true,
  })
  const [state, setState] = useState<T>(initialState)

  const updateState = useCallback(
    (value: T) => {
      setState(value)
      setData(value)
    },
    [setState, setData]
  )

  useEffect(() => {
    if (isInit.current && !isInitState && !isLoading) {
      if (data) setState(data)
      isInit.current = false
    }
  }, [isLoading, isInitState, data])

  return [state, updateState] as const
}
