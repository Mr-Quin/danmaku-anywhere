import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { isCustomEpisode } from '@/common/danmaku/utils'
import type { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import type { EpisodeOutcome } from '@/content/controller/common/outcomes'
import type { EpisodeRun } from '@/content/controller/danmaku/integration/episodeRuns'
import { matchEpisode } from '@/content/controller/danmaku/integration/matchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

export type FindOutcome =
  | EpisodeOutcome
  | { status: 'ambiguous'; seasons: Season[] }

// An episode the page has moved on from comes back as 'cancelled' with
// nothing mounted.
type Loader = Pick<
  ReturnType<typeof useLoadDanmaku>,
  'loadMutation' | 'mountOutcome'
>

export function useFindEpisodeDanmaku({ loadMutation, mountOutcome }: Loader) {
  return useEventCallback(
    async (
      run: EpisodeRun,
      media: MediaInfo,
      season?: Season
    ): Promise<FindOutcome> => {
      const title = season?.title ?? media.title
      const matched = await matchEpisode({
        mapKey: media.getKey(),
        title,
        episodeNumber: media.episode,
        originalTitle: season ? undefined : media.originalTitle,
        seasonId: season?.id,
      })
      if (!run.isCurrent()) {
        return { status: 'cancelled' }
      }

      switch (matched.status) {
        case 'failed':
          return { status: 'matchFailed', error: matched.error }
        case 'notFound':
          return { status: 'notFound', title }
        case 'ambiguous':
          return { status: 'ambiguous', seasons: matched.seasons }
        case 'matched':
          break
      }

      const { episode } = matched
      if (!isCustomEpisode(episode)) {
        return loadMutation.mutateAsync({
          request: {
            type: 'by-meta',
            meta: episode,
            options: {
              forceUpdate: false,
              automatic: true,
            },
          },
          signal: run.signal,
        })
      }
      return mountOutcome(episode, run.signal)
    }
  )
}
