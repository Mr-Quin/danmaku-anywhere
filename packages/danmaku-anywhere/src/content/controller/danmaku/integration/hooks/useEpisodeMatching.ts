import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isCustomEpisode } from '@/common/danmaku/utils'
import { useDescribeOutcome } from '@/content/controller/common/hooks/useDescribeOutcome'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import type { EpisodeRun } from '@/content/controller/danmaku/integration/episodeRuns'
import type { EpisodeToast } from '@/content/controller/danmaku/integration/episodeToast'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { usePopup } from '@/content/controller/store/popupStore'
import {
  type FindOutcome,
  useFindEpisodeDanmaku,
} from './useFindEpisodeDanmaku'

/**
 * Works through one run of automatic matching: shows progress, finds and
 * mounts the episode, reports the outcome on the episode toast, and offers
 * seasons to pick from when the match was ambiguous.
 */
export function useEpisodeMatching(toast: EpisodeToast) {
  const { t } = useTranslation()

  const loader = useLoadDanmaku()
  const find = useFindEpisodeDanmaku(loader)
  const describeOutcome = useDescribeOutcome()

  function findingMessage(media: MediaInfo) {
    return t('integration.alert.finding', 'Finding danmaku for {{name}}…', {
      name: media.toString(),
    })
  }

  function report(run: EpisodeRun, media: MediaInfo, outcome: FindOutcome) {
    if (outcome.status === 'ambiguous') {
      toast.dismiss(run)
      return
    }
    const described = describeOutcome(outcome, {
      // A local file's title often names only the show.
      name:
        outcome.status === 'mounted' && isCustomEpisode(outcome.episode)
          ? media.toString()
          : undefined,
      onRefresh: () => {
        void loader.refreshComments({ signal: run.signal })
      },
    })
    if (!described) {
      return
    }
    toast.report(run, described.severity, described.message, described.action)
  }

  async function work(run: EpisodeRun, media: MediaInfo, season?: Season) {
    toast.progress(run, findingMessage(media))
    const outcome = await find(run, media, season)
    report(run, media, outcome)
    return outcome
  }

  function offerSeasons(run: EpisodeRun, media: MediaInfo, seasons: Season[]) {
    let applying = false
    const selection = usePopup.getState().offerSelection({
      label: media.toString(),
      seasons,
      apply: async (season) => {
        if (applying || !run.isCurrent()) {
          return
        }
        applying = true
        try {
          const outcome = await work(run, media, season)
          if (outcome.status === 'mounted' || outcome.status === 'unchanged') {
            usePopup.getState().closeSelection(selection)
          }
        } finally {
          applying = false
        }
      },
    })
    run.signal.addEventListener(
      'abort',
      () => {
        usePopup.getState().withdrawSelection(selection)
      },
      { once: true }
    )
  }

  return useEventCallback(async (run: EpisodeRun, media: MediaInfo) => {
    const outcome = await work(run, media)
    if (outcome.status === 'ambiguous' && run.isCurrent()) {
      offerSeasons(run, media, outcome.seasons)
    }
  })
}
