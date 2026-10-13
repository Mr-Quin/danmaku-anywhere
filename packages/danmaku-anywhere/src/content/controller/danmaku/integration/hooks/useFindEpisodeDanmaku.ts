import type {
  CustomEpisode,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { describeKeptStored } from '@/common/danmaku/queries/useFetchDanmaku'
import { isCustomEpisode } from '@/common/danmaku/utils'
import { describeMountError } from '@/content/controller/common/hooks/mountError'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import type { EpisodeRun } from '@/content/controller/danmaku/integration/episodeRuns'
import type { EpisodeToast } from '@/content/controller/danmaku/integration/episodeToast'
import { matchEpisode } from '@/content/controller/danmaku/integration/matchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import {
  PopupTab,
  type SeasonSelection,
  usePopup,
} from '@/content/controller/store/popupStore'
import { useDescribeSourceError } from './useDescribeSourceError'

/**
 * Matches the episode a run was started for and mounts its danmaku, reporting
 * through the episode toast. Each step checks the run first, and the run's
 * signal goes with the mount to the player, so nothing for an episode the page
 * has moved on from is mounted, shown or offered for selection.
 */
export function useFindEpisodeDanmaku(toast: EpisodeToast) {
  const { t } = useTranslation()

  const describeSourceError = useDescribeSourceError()
  const { loadMutation, mountDanmaku, describeMounted } = useLoadDanmaku()

  function findingMessage(media: MediaInfo) {
    return t('integration.alert.finding', 'Finding danmaku for {{name}}…', {
      name: media.toString(),
    })
  }

  async function mountLocal(
    run: EpisodeRun,
    media: MediaInfo,
    episode: CustomEpisode
  ) {
    try {
      const result = await mountDanmaku([episode], {
        silent: true,
        signal: run.signal,
      })
      if (result.status === 'cancelled') {
        return
      }
    } catch (error) {
      toast.fail(run, describeMountError(error))
      return
    }
    // A local file's title often names only the show.
    const { message, ...action } = describeMounted(episode, {
      name: media.toString(),
      signal: run.signal,
    })
    toast.succeed(run, message, action)
  }

  async function loadFromSource(
    run: EpisodeRun,
    episode: WithSeason<EpisodeMeta>
  ) {
    const outcome = await loadMutation.mutateAsync({
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
    switch (outcome.status) {
      case 'cancelled':
        return
      case 'fetchFailed': {
        const { message, ...action } = describeSourceError({
          error: outcome.error,
          describeFailure: (reason) =>
            t(
              'danmaku.alert.fetchError',
              'Failed to fetch danmaku: {{message}}',
              { message: reason }
            ),
          providerConfigId: episode.season.providerConfigId,
        })
        toast.fail(run, message, action)
        return
      }
      case 'mountFailed':
        toast.fail(run, describeMountError(outcome.error))
        return
      case 'unchanged':
        toast.warn(run, describeKeptStored(outcome.keptStored))
        return
      case 'mounted': {
        const { message, ...action } = describeMounted(outcome.episode, {
          signal: run.signal,
        })
        toast.succeed(run, message, action)
        return
      }
    }
  }

  function offerSeasons(run: EpisodeRun, media: MediaInfo, seasons: Season[]) {
    const selection: SeasonSelection = {
      id: run.generation,
      label: media.toString(),
      seasons,
      apply: async (season) => {
        if (!run.isCurrent()) {
          return
        }
        toast.progress(run, findingMessage(media))
        await find(run, media, season)
        usePopup.getState().closeSelection(selection)
      },
    }
    run.signal.addEventListener(
      'abort',
      () => {
        usePopup.getState().withdrawSelection(selection)
      },
      { once: true }
    )
    usePopup.getState().offerSelection(selection)
  }

  async function find(run: EpisodeRun, media: MediaInfo, season?: Season) {
    const title = season?.title ?? media.title
    const outcome = await matchEpisode({
      mapKey: media.getKey(),
      title,
      episodeNumber: media.episode,
      originalTitle: season ? undefined : media.originalTitle,
      seasonId: season?.id,
    })
    if (!run.isCurrent()) {
      return
    }

    switch (outcome.status) {
      case 'failed': {
        const { message, ...action } = describeSourceError({
          error: outcome.error,
          describeFailure: (reason) =>
            t(
              'integration.alert.matchError',
              'Failed to match episode: {{message}}',
              { message: reason }
            ),
        })
        toast.fail(run, message, action)
        return
      }
      case 'notFound':
        toast.fail(
          run,
          t(
            'integration.alert.noEpisodeFound',
            'No episode found for {{title}}',
            { title }
          ),
          {
            actionFn: () => usePopup.getState().open({ tab: PopupTab.Search }),
            actionLabel: t('integration.alert.openSearch', 'Open search page'),
          }
        )
        return
      case 'ambiguous':
        toast.dismiss(run)
        offerSeasons(run, media, outcome.seasons)
        return
      case 'matched':
        if (isCustomEpisode(outcome.episode)) {
          await mountLocal(run, media, outcome.episode)
          return
        }
        await loadFromSource(run, outcome.episode)
        return
    }
  }

  return useEventCallback((run: EpisodeRun, media: MediaInfo) => {
    toast.progress(run, findingMessage(media))
    return find(run, media)
  })
}
