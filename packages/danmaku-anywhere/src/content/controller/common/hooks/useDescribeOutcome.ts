import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { describeKeptStored } from '@/common/danmaku/describeKeptStored'
import type { KeptStored } from '@/common/danmaku/dto'
import { episodeToString, isSourceEpisode } from '@/common/danmaku/utils'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { describeMountError } from './mountError'
import { useDescribeSourceError } from './useDescribeSourceError'

export type LoadOutcome =
  // A local file's title often names only the show, so the caller can name
  // it instead.
  | { status: 'mounted'; episode: GenericEpisode; name?: string }
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

export interface OutcomeMessage {
  severity: Severity
  message: string
  action?: Pick<ToastOptions, 'actionFn' | 'actionLabel'>
}

interface DescribeOptions {
  refreshed?: boolean
  // Offered on a mounted episode that its source can refresh.
  onRefresh?: () => void
}

export function isRefreshable(episode: GenericEpisode) {
  return isSourceEpisode(episode) && episode.season.manifestId === 'dandanplay'
}

// Words what happened to a load, match or refresh for the user. Returns
// nothing for an outcome that has nothing to say.
export function useDescribeOutcome() {
  const { t } = useTranslation()
  const describeSourceError = useDescribeSourceError()

  const searchAction = () => {
    return {
      actionFn: () => usePopup.getState().open({ tab: PopupTab.Search }),
      actionLabel: t('integration.alert.openSearch', 'Open search page'),
    }
  }

  return useEventCallback(
    (
      outcome: EpisodeOutcome,
      { refreshed = false, onRefresh }: DescribeOptions = {}
    ): OutcomeMessage | undefined => {
      switch (outcome.status) {
        case 'cancelled':
          return undefined
        case 'mounted': {
          const name = outcome.name ?? episodeToString(outcome.episode)
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
              onRefresh && !refreshed && isRefreshable(outcome.episode)
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
