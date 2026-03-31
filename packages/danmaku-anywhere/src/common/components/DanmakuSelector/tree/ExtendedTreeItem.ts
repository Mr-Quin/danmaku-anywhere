import type {
  CustomSeason,
  EpisodeStub,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { TreeViewBaseItem } from '@mui/x-tree-view/models'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SeasonTreeItem extends TreeViewBaseItem {
  kind: 'season'
  data: Season | CustomSeason
  provider?: ProviderConfig
  bookmarked?: boolean
  children?: ExtendedTreeItem[]
}

interface EpisodeTreeItem extends TreeViewBaseItem {
  kind: 'episode'
  data: GenericEpisodeLite
  children?: ExtendedTreeItem[]
}

export interface FolderTreeItem extends TreeViewBaseItem {
  kind: 'folder'
  children: ExtendedTreeItem[]
}

interface StubEpisodeTreeItem extends TreeViewBaseItem {
  kind: 'stub'
  data: EpisodeStub
  seasonId: number
  season: Season
  children?: never
}

export type ExtendedTreeItem =
  | SeasonTreeItem
  | EpisodeTreeItem
  | FolderTreeItem
  | StubEpisodeTreeItem
