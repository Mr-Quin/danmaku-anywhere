import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { TreeViewBaseItem } from '@mui/x-tree-view/models'

// Extended Tree Item to include data
export interface ExtendedTreeItem extends TreeViewBaseItem {
  kind: 'season' | 'episode'
  data: Season | CustomSeason | GenericEpisodeLite
  children?: ExtendedTreeItem[]
}
