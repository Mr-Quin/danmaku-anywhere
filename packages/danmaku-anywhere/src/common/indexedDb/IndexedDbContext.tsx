import { createContext, PropsWithChildren, useContext } from 'react'
import { DanmakuCache } from '@/common/hooks/danmaku/useDanmakuDb'
import { useIndexedDB } from '@/common/indexedDb/useIndexedDb'

type IndexedDBContextProps<T = DanmakuCache> = ReturnType<
  typeof useIndexedDB<T>
>

const IndexedDBContext = createContext<IndexedDBContextProps | undefined>(
  undefined
)

export const useIndexedDBContext = () => {
  const context = useContext(IndexedDBContext)
  if (!context) {
    throw new Error('useIndexedDBContext must be used within IndexedDBProvider')
  }
  return context
}

const DANMAKU_DB = 'danmaku'
const DANMAKU_STORE = 'dandanplay'

export const DanmakuDbProvider = ({ children }: PropsWithChildren) => {
  const indexedDBStateAndMethods = useIndexedDB<DanmakuCache>(
    DANMAKU_DB,
    DANMAKU_STORE,
    1,
    {
      storeParams: {
        keyPath: 'meta.episodeId',
      },
    }
  )

  return (
    <IndexedDBContext.Provider value={indexedDBStateAndMethods}>
      {children}
    </IndexedDBContext.Provider>
  )
}
