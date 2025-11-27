import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { createContext, useContext } from 'react'
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

interface DanmakuTreeContextType {
  itemMap: Record<string, ExtendedTreeItem>
  onSelect: (episode: GenericEpisodeLite) => void
  setViewingDanmaku: (episode: GenericEpisodeLite) => void
  deletingDanmaku: DanmakuDeleteProps | null
  setDeletingDanmaku: (props: DanmakuDeleteProps | null) => void
}

// Context to pass item data to CustomTreeItem without prop drilling through library components
export const DanmakuTreeContext = createContext<DanmakuTreeContextType>({
  itemMap: {},
  onSelect: () => undefined,
  setViewingDanmaku: (episode: GenericEpisodeLite) => undefined,
  deletingDanmaku: null,
  setDeletingDanmaku: (props: DanmakuDeleteProps | null) => undefined,
})

export const useDanmakuTreeContext = () => {
  return useContext(DanmakuTreeContext)
}
