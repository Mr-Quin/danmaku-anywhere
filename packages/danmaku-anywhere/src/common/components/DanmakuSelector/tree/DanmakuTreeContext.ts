import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  createContext,
  type RefObject,
  type SyntheticEvent,
  useContext,
} from 'react'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/tree/ExtendedTreeItem'

// The API is not exported by the library, so we need to define it here
export interface MUITreePublicApi {
  setItemSelection: (props: {
    event?: SyntheticEvent
    itemId: string
    keepExistingSelection?: boolean
    shouldBeSelected?: boolean
  }) => void
}

interface DanmakuTreeContextType {
  itemMap: Map<string, ExtendedTreeItem>
  apiRef: RefObject<MUITreePublicApi> | null
  isMultiSelect: boolean
  setViewingDanmaku: (episode: GenericEpisodeLite) => void
}

export const DanmakuTreeContext = createContext<DanmakuTreeContextType>({
  itemMap: new Map<string, ExtendedTreeItem>(),
  apiRef: null,
  isMultiSelect: false,
  setViewingDanmaku: (episode: GenericEpisodeLite) => undefined,
})

export const useDanmakuTreeContext = () => {
  return useContext(DanmakuTreeContext)
}
