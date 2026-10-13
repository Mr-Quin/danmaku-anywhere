import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { describeKeptStored } from '@/common/danmaku/describeKeptStored'
import { episodeToString } from '@/common/danmaku/utils'
import { describeCode, describeError } from '@/common/errors/describeError'
import {
  type EpisodeOutcome,
  isRefreshable,
} from '@/content/controller/common/outcomes'
import { mountFailedMessage } from './mountError'
import { useErrorToastAction } from './useErrorToastAction'

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
  const toastAction = useErrorToastAction()

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
            message: mountFailedMessage(outcome.error),
          }
        case 'fetchFailed': {
          const { message } = describeError(outcome.error)
          return {
            severity: 'error',
            message: t(
              'danmaku.alert.fetchError',
              'Failed to fetch danmaku: {{message}}',
              { message }
            ),
            action: toastAction.forError(outcome.error),
          }
        }
        case 'matchFailed': {
          const { message } = describeError(outcome.error)
          return {
            severity: 'error',
            message: t(
              'integration.alert.matchError',
              'Failed to match episode: {{message}}',
              { message }
            ),
            action: toastAction.forError(outcome.error),
          }
        }
        case 'notFound':
          return {
            severity: 'error',
            message: describeCode('match.notFound', { title: outcome.title }),
            action: toastAction.openSearch(),
          }
      }
    }
  )
}
