import { useEffect, useMemo, useRef } from 'react'
import { useAsyncLifecycle } from '@/common/hooks/useAsyncLifecycle'
import { mainLogger } from '@/common/logger'

export const useIndexedDB = <T>(
  dbName: string,
  storeName: string,
  version = 1,
  { storeParams = {} }: { storeParams?: IDBObjectStoreParameters } = {}
) => {
  const [state, dispatch] = useAsyncLifecycle<IDBDatabase>()

  const listeners = useRef<((data: T[]) => void)[]>([])

  const db = state.data

  useEffect(() => {
    const openRequest = indexedDB.open(dbName, version)
    dispatch({ type: 'LOADING' })

    openRequest.onupgradeneeded = function () {
      const db = openRequest.result

      if (!db.objectStoreNames.contains(storeName)) {
        mainLogger.log('Creating store', storeName)
        db.createObjectStore(storeName, storeParams)
      }
    }

    openRequest.onsuccess = function () {
      dispatch({
        type: 'SET',
        payload: openRequest.result,
      })
    }

    openRequest.onerror = function () {
      dispatch({
        type: 'ERROR',
        payload: openRequest.error,
      })
    }

    return () => {
      db?.close()
    }
  }, [dbName, storeName, version, dispatch])

  const methods = useMemo(() => {
    const getAll = () => {
      return new Promise<T[]>((resolve, reject) => {
        if (!db) return reject('Database not initialized')
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }

    const notifyListeners = async () => {
      const data = await getAll()
      listeners.current.forEach((listener) => listener(data))
    }

    const setAll = (items: T[]) => {
      return new Promise<void>((resolve, reject) => {
        if (!db) return reject('Database not initialized')
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        items.forEach((item) => store.put(item))
        tx.oncomplete = () => {
          resolve()
          notifyListeners()
        }
        tx.onerror = () => reject(tx.error)
      })
    }

    const get = (key: IDBValidKey) => {
      return new Promise<T>((resolve, reject) => {
        if (!db) return reject('Database not initialized')
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }

    const set = (key: IDBValidKey, value: T, inline = false) => {
      return new Promise<void>((resolve, reject) => {
        if (!db) return reject('Database not initialized')
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        if (inline) {
          store.put(value)
        } else {
          store.put(value, key)
        }
        tx.oncomplete = () => {
          resolve()
          notifyListeners()
        }
        tx.onerror = () => reject(tx.error)
      })
    }

    const remove = (key: IDBValidKey) => {
      return new Promise<void>((resolve, reject) => {
        if (!db) return reject('Database not initialized')
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.delete(key)
        tx.oncomplete = () => {
          resolve()
          notifyListeners()
        }
        tx.onerror = () => reject(tx.error)
      })
    }

    const subscribe = (listener: (data: T[]) => void) => {
      listeners.current.push(listener)

      // return unsubscribe function
      return () => {
        listeners.current = listeners.current.filter((l) => l !== listener)
      }
    }

    return {
      getAll,
      setAll,
      get,
      set,
      remove,
      subscribe,
    }
  }, [db])

  return {
    ...state,
    ...methods,
    db,
  }
}
