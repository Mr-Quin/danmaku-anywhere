import type {
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { createContext, useContext } from 'react'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/ExtendedTreeItem'

export type DanmakuDeleteProps =
  | {
      kind: 'season'
      season: Season
    }
  | {
      kind: 'episode'
      episode: GenericEpisodeLite
    }

interface DanmakuTreeContextType {
  itemMap: Record<string, ExtendedTreeItem>
  onSelect: (episode: GenericEpisodeLite) => void
  setViewingDanmaku: (episode: GenericEpisodeLite) => void
  setDeletingDanmaku: (props: DanmakuDeleteProps) => void
}

// Context to pass item data to CustomTreeItem without prop drilling through library components
export const DanmakuTreeContext = createContext<DanmakuTreeContextType>({
  itemMap: {},
  onSelect: () => undefined,
  setViewingDanmaku: (episode: GenericEpisodeLite) => undefined,
  setDeletingDanmaku: (props: DanmakuDeleteProps) => undefined,
})

export const useDanmakuTreeContext = () => {
  return useContext(DanmakuTreeContext)
}
