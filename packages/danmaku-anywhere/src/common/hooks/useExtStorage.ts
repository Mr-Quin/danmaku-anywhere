import { useEffect, useMemo } from 'react'
import { useAsyncLifecycle } from '@/common/hooks/useAsyncLifecycle'
import { IS_EXTENSION } from '@/common/utils'

export type StorageType = 'local' | 'sync' | 'session'

export type StorageConfig = {
  sync?: boolean
  storageType?: StorageType
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { sync = true, storageType = 'local' }: StorageConfig = {}
) => {
  if (!IS_EXTENSION)
    throw new Error('useExtStorage can only be used in extensions')

  const [state, dispatch] = useAsyncLifecycle<T>()

  const storage = chrome.storage[storageType]

  const { get, set, remove } = useMemo(() => {
    const get = async () => {
      dispatch({ type: 'LOADING' })
      try {
        if (key === null) {
          const result = await storage.get(null)
          dispatch({ type: 'SET', payload: result as T })
        } else {
          const result = await storage.get(key)
          if (Array.isArray(key)) {
            dispatch({ type: 'SET', payload: result as T })
          } else {
            dispatch({ type: 'SET', payload: result[key] })
          }
        }
      } catch (e) {
        dispatch({ type: 'ERROR', payload: e })
      }
    }

    const set = async (value: T) => {
      if (key === null || Array.isArray(key)) return
      if (!sync) dispatch({ type: 'LOADING' })
      try {
        await storage.set({ [key]: value })
        dispatch({ type: 'SET', payload: value })
      } catch (e) {
        dispatch({ type: 'ERROR', payload: e })
      }
    }

    const remove = async () => {
      if (!sync) dispatch({ type: 'LOADING' })
      try {
        if (key === null) {
          await storage.clear()
        } else {
          await storage.remove(key)
        }
        dispatch({ type: 'SET', payload: null })
      } catch (e) {
        dispatch({ type: 'ERROR', payload: e })
      }
    }

    return {
      get,
      set,
      remove,
    }
  }, [key, storage, sync])

  const deps = Array.isArray(key) ? key : [key]

  useEffect(() => {
    if (state.isInit) dispatch({ type: 'INIT' })

    get()
  }, [...deps, get, state.isInit])

  useEffect(() => {
    // listen to storage change from elsewhere and update state
    if (typeof key === 'string') {
      const listener = (changes: {
        [p: string]: chrome.storage.StorageChange
      }) => {
        if (changes[key]) {
          console.log('storage change', key, changes)
          dispatch({ type: 'SET', payload: changes[key].newValue })
        }
      }
      storage.onChanged.addListener(listener)

      return () => {
        storage.onChanged.removeListener(listener)
      }
    }
  }, [...deps, storage])

  return { ...state, setData: set, getData: get, remove }
}

export default useExtStorage
