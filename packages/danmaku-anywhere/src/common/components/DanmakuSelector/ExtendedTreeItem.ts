import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { TreeViewBaseItem } from '@mui/x-tree-view/models'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SeasonTreeItem extends TreeViewBaseItem {
  kind: 'season'
  data: Season | CustomSeason
  provider?: ProviderConfig
  children?: ExtendedTreeItem[]
}

interface EpisodeTreeItem extends TreeViewBaseItem {
  kind: 'episode'
  data: GenericEpisodeLite
  children?: ExtendedTreeItem[]
}

export type ExtendedTreeItem = SeasonTreeItem | EpisodeTreeItem
