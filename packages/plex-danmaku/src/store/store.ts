import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import { createSelectors } from './createSelectors'
import { createDanmakuSlice, DanmakuCache, DanmakuSlice } from './danmakuSlice'
import { createMediaSlice, MediaSlice } from './mediaSlice'
import { logger } from '@/utils/logger'

interface DbSlice {
  db: IDBPDatabase<DanmakuDb> | null
  openDb: () => Promise<void>
}

interface DanmakuDb extends DBSchema {
  danmaku: {
    key: number
    value: DanmakuCache
    indexes: { byTime: number }
  }
}

export type State = MediaSlice & DanmakuSlice & DbSlice

const useStoreBase = create<State>((set, get, store) => ({
  db: null,
  openDb: async () => {
    try {
      const db = await openDB<DanmakuDb>('danmaku', 1, {
        upgrade: (db, oldV, newV) => {
          logger.log(`Upgrading indexedDB from ${oldV} to ${newV}`)

          const danmakuStore = db.createObjectStore('danmaku', {
            keyPath: 'episodeId',
          })

          danmakuStore.createIndex('byTime', 'time')
        },
        blocked: () => {
          logger.log('IndexedDB is blocked, please close other tabs')
        },
        blocking: () => {
          logger.log('Page is blocking indexedDB, please refresh')
        },
      })

      db.onerror = (err) => {
        logger.error(err)
      }

      set({ db })
    } catch (err) {
      logger.error('Error opening indexedDB')
      logger.error(err)
    }
  },
  ...createMediaSlice(set, get, store),
  ...createDanmakuSlice(set, get, store),
}))

export const useStore = createSelectors(useStoreBase)

export const useMedia = () => {
  return useStore((state) => state.media, shallow)
}

export const useDanmaku = () => {
  return useStore((state) => state.danmaku, shallow)
}

// debugging, stripped in build
;(window as any).useStore = useStore
