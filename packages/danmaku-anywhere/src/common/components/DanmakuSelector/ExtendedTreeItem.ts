import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { TreeViewBaseItem } from '@mui/x-tree-view/models'

interface SeasonTreeItem extends TreeViewBaseItem {
  kind: 'season'
  data: Season | CustomSeason
  children?: ExtendedTreeItem[]
}

interface EpisodeTreeItem extends TreeViewBaseItem {
  kind: 'episode'
  data: GenericEpisodeLite
  children?: ExtendedTreeItem[]
}

export type ExtendedTreeItem = SeasonTreeItem | EpisodeTreeItem
