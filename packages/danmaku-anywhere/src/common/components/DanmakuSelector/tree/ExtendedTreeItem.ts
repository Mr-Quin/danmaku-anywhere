import type {
  CustomSeason,
  EpisodeStub,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { TreeViewDefaultItemModelProperties } from '@mui/x-tree-view/models'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SeasonTreeItem extends TreeViewDefaultItemModelProperties {
  kind: 'season'
  data: Season | CustomSeason
  provider?: ProviderConfig
  bookmarked?: boolean
  children?: ExtendedTreeItem[]
}

interface EpisodeTreeItem extends TreeViewDefaultItemModelProperties {
  kind: 'episode'
  data: GenericEpisodeLite
  children?: ExtendedTreeItem[]
}

export interface FolderTreeItem extends TreeViewDefaultItemModelProperties {
  kind: 'folder'
  folderPath: string
  children: ExtendedTreeItem[]
}

interface StubEpisodeTreeItem extends TreeViewDefaultItemModelProperties {
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
