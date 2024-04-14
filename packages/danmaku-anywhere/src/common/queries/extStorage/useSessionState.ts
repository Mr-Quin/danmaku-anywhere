import { useEffect, useRef, useState } from 'react'

import { useExtStorage } from './useExtStorage'

import type { NonFunctionGuard } from '@/common/types/types'

export const useSessionState = <T>(
  initialState: NonFunctionGuard<T>,
  key: string
) => {
  const [state, setState] = useState<T>(initialState)
  const [enableQuery, setEnableQuery] = useState(false)

  const { data, update, isLoading } = useExtStorage<T>(key, {
    storageType: 'session',
    queryOptions: {
      enabled: enableQuery,
      placeholderData: initialState,
    },
  })

  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && data !== undefined) {
      setState(data)
      initialized.current = true
    }
  }, [data])

  useEffect(() => {
    update.mutateAsync(state).then(() => {
      setEnableQuery(true)
    })
  }, [state])

  return [state, setState, isLoading] as const
}
