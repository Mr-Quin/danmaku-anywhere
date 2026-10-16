import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { describeKeptStored } from '@/common/danmaku/describeKeptStored'
import { episodeToString, isSourceEpisode } from '@/common/danmaku/utils'
import { mayOffer } from '@/common/providers/sourceCapabilities'
import { sourceCapabilitiesQuery } from '@/common/providers/useSourceCapabilities'
import type { EpisodeOutcome } from '@/content/controller/common/outcomes'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { describeMountError } from './mountError'
import { useDescribeSourceError } from './useDescribeSourceError'

export interface OutcomeMessage {
  severity: Severity
  message: string
  action?: Pick<ToastOptions, 'actionFn' | 'actionLabel'>
}

interface DescribeOptions {
  refreshed?: boolean
  // Names the mounted episode instead of its own title.
  name?: string
  // Offered on a mounted episode that its source can refresh.
  onRefresh?: () => void
}

// Words what happened to a load, match or refresh for the user. Returns
// nothing for an outcome that has nothing to say.
export function useDescribeOutcome() {
  const { t } = useTranslation()
  const describeSourceError = useDescribeSourceError()
  const queryClient = useQueryClient()

  // Reads only what is already cached, so the toast never waits on the
  // background. A refresh the source cannot do is refused by the background.
  const mayRefetch = (episode: GenericEpisode): boolean => {
    if (!isSourceEpisode(episode)) {
      return false
    }
    const { queryKey } = sourceCapabilitiesQuery(
      episode.season.providerConfigId
    )
    return mayOffer(queryClient.getQueryData(queryKey), 'danmaku')
  }

  const searchAction = () => {
    return {
      actionFn: () => usePopup.getState().open({ tab: PopupTab.Search }),
      actionLabel: t('integration.alert.openSearch', 'Open search page'),
    }
  }

  return useEventCallback(
    (
      outcome: EpisodeOutcome,
      { refreshed = false, name: displayName, onRefresh }: DescribeOptions = {}
    ): OutcomeMessage | undefined => {
      switch (outcome.status) {
        case 'cancelled':
          return undefined
        case 'mounted': {
          const name = displayName ?? episodeToString(outcome.episode)
          const count = outcome.episode.commentCount
          return {
            severity: 'success',
            message: refreshed
              ? t(
                  'danmaku.alert.refreshed',
                  'Refreshed {{name}}: {{count}} comments',
                  { name, count }
                )
              : t(
                  'danmaku.alert.mounted',
                  'Mounted {{name}}: {{count}} comments',
                  { name, count }
                ),
            action:
              onRefresh && !refreshed && mayRefetch(outcome.episode)
                ? {
                    actionFn: onRefresh,
                    actionLabel: t('danmaku.refresh', 'Refresh Danmaku'),
                  }
                : undefined,
          }
        }
        case 'unchanged':
          return {
            severity: 'warning',
            message: describeKeptStored(outcome.keptStored),
          }
        case 'mountFailed':
          return {
            severity: 'error',
            message: describeMountError(outcome.error),
          }
        case 'fetchFailed': {
          const { message, ...action } = describeSourceError({
            error: outcome.error,
            describeFailure: (reason) =>
              t(
                'danmaku.alert.fetchError',
                'Failed to fetch danmaku: {{message}}',
                { message: reason }
              ),
            providerConfigId: outcome.providerConfigId,
          })
          return { severity: 'error', message, action }
        }
        case 'matchFailed': {
          const { message, ...action } = describeSourceError({
            error: outcome.error,
            describeFailure: (reason) =>
              t(
                'integration.alert.matchError',
                'Failed to match episode: {{message}}',
                { message: reason }
              ),
          })
          return { severity: 'error', message, action }
        }
        case 'notFound':
          return {
            severity: 'error',
            message: t(
              'integration.alert.noEpisodeFound',
              'No episode found for {{title}}',
              { title: outcome.title }
            ),
            action: searchAction(),
          }
      }
    }
  )
}
