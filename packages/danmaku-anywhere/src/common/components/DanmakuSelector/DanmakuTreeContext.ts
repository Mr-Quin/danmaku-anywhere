import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { createContext, type SyntheticEvent, useContext } from 'react'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/ExtendedTreeItem'

export type DanmakuDeleteProps =
  | {
      kind: 'season'
      season: Season | CustomSeason
    }
  | {
      kind: 'episode'
      episode: GenericEpisodeLite
    }

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
  itemMap: Record<string, ExtendedTreeItem>
  apiRef: MUITreePublicApi | null
  isMultiSelect: boolean
  setViewingDanmaku: (episode: GenericEpisodeLite) => void
  deletingDanmaku: DanmakuDeleteProps | null
  setDeletingDanmaku: (props: DanmakuDeleteProps | null) => void
}

// Context to pass item data to CustomTreeItem without prop drilling through library components
export const DanmakuTreeContext = createContext<DanmakuTreeContextType>({
  itemMap: {},
  apiRef: null,
  isMultiSelect: false,
  setViewingDanmaku: (episode: GenericEpisodeLite) => undefined,
  deletingDanmaku: null,
  setDeletingDanmaku: (props: DanmakuDeleteProps | null) => undefined,
})

export const useDanmakuTreeContext = () => {
  return useContext(DanmakuTreeContext)
}
