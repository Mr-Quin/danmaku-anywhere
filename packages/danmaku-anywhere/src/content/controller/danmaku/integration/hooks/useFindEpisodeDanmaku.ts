import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isCustomEpisode } from '@/common/danmaku/utils'
import { describeMountError } from '@/content/controller/common/hooks/mountError'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import type { EpisodeOperation } from '@/content/controller/danmaku/integration/episodeToast'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { useDescribeSourceError } from './useDescribeSourceError'
import { useMatchEpisode } from './useMatchEpisode'

/**
 * Matches the episode on the page and mounts its danmaku, reporting the
 * outcome to the operation it was started with. Once that operation is no
 * longer current nothing further happens: an episode the page has moved on
 * from is not mounted and does not open the selector.
 */
export function useFindEpisodeDanmaku() {
  const { t } = useTranslation()

  const { open } = usePopup()
  const { match } = useMatchEpisode()
  const describeSourceError = useDescribeSourceError()
  const { loadMutation, mountDanmaku, describeMounted } = useLoadDanmaku()

  async function loadFromSource(
    meta: WithSeason<EpisodeMeta>,
    operation: EpisodeOperation
  ) {
    let loaded: Awaited<ReturnType<typeof loadMutation.mutateAsync>>
    try {
      loaded = await loadMutation.mutateAsync({
        request: {
          type: 'by-meta',
          meta,
          options: {
            forceUpdate: false,
            automatic: true,
          },
        },
        silent: true,
        shouldMount: operation.isCurrent,
      })
    } catch (error) {
      const { message, ...action } = describeSourceError({
        error,
        describeFailure: (reason) =>
          t(
            'danmaku.alert.fetchError',
            'Failed to fetch danmaku: {{message}}',
            { message: reason }
          ),
        providerConfigId: meta.season.providerConfigId,
      })
      operation.fail(message, action)
      return
    }

    if (loaded.mountError !== undefined) {
      operation.fail(describeMountError(loaded.mountError))
      return
    }
    if (!loaded.mounted) {
      operation.dismiss()
      return
    }
    const { message, ...action } = describeMounted(loaded.episode)
    operation.succeed(message, action)
  }

  return useEventCallback(
    async (media: MediaInfo, operation: EpisodeOperation) => {
      const outcome = await match({
        mapKey: media.getKey(),
        title: media.title,
        episodeNumber: media.episode,
        originalTitle: media.originalTitle,
      })
      if (!operation.isCurrent()) {
        return
      }

      if (outcome.status === 'failed') {
        operation.fail(outcome.message, outcome.action)
        return
      }
      if (outcome.status === 'ambiguous') {
        operation.dismiss()
        open({ animes: outcome.seasons, tab: PopupTab.Selector })
        return
      }

      const { episode } = outcome
      if (!isCustomEpisode(episode)) {
        await loadFromSource(episode, operation)
        return
      }
      try {
        await mountDanmaku([episode], { silent: true })
      } catch (error) {
        operation.fail(describeMountError(error))
        return
      }
      // A local file's title often names only the show.
      const { message, ...action } = describeMounted(episode, media.toString())
      operation.succeed(message, action)
    }
  )
}
