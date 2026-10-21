import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import type { KeptStored } from '@/common/danmaku/dto'

export type LoadOutcome =
  | { status: 'mounted'; episode: GenericEpisode }
  // The refetch came back with fewer comments, and the stored episode is
  // already the one mounted.
  | { status: 'unchanged'; keptStored: KeptStored }
  | { status: 'cancelled' }
  | { status: 'fetchFailed'; error: unknown; providerConfigId?: string }
  | { status: 'mountFailed'; error: unknown }

export type EpisodeOutcome =
  | LoadOutcome
  | { status: 'matchFailed'; error: unknown }
  | { status: 'notFound'; title: string }
