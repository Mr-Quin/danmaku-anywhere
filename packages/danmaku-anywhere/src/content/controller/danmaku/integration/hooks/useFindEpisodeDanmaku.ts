import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { isCustomEpisode } from '@/common/danmaku/utils'
import type { EpisodeOutcome } from '@/content/controller/common/hooks/useDescribeOutcome'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import type { EpisodeRun } from '@/content/controller/danmaku/integration/episodeRuns'
import { matchEpisode } from '@/content/controller/danmaku/integration/matchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

export type FindOutcome =
  | EpisodeOutcome
  | { status: 'ambiguous'; seasons: Season[] }

/**
 * Matches the episode a run was started for and mounts its danmaku. Each step
 * checks the run first, and the run's signal goes with the mount to the
 * player, so an episode the page has moved on from comes back as 'cancelled'
 * without anything mounted.
 */
export function useFindEpisodeDanmaku() {
  const { loadMutation, mount } = useLoadDanmaku()

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
      try {
        const result = await mount([episode], { signal: run.signal })
        if (result.status === 'cancelled') {
          return result
        }
      } catch (error) {
        return { status: 'mountFailed', error }
      }
      return { status: 'mounted', episode, name: media.toString() }
    }
  )
}
