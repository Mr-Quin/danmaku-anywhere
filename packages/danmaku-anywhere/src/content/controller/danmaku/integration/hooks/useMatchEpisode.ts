import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import type { ToastOptions } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { useDescribeSourceError } from './useDescribeSourceError'

type MatchedEpisode = Extract<MatchEpisodeResult, { status: 'success' }>['data']

export type EpisodeMatch =
  | { status: 'matched'; episode: MatchedEpisode }
  | { status: 'ambiguous'; seasons: Season[] }
  | {
      status: 'failed'
      message: string
      action: Pick<ToastOptions, 'actionFn' | 'actionLabel'>
    }

export function useMatchEpisode() {
  const { t } = useTranslation()

  const { open } = usePopup()
  const describeSourceError = useDescribeSourceError()

  const mutation = useMutation({
    mutationFn: (input: MatchEpisodeInput) => {
      return chromeRpcClient.episodeMatch(input)
    },
    retry: false,
  })

  const match = useEventCallback(
    async (input: MatchEpisodeInput): Promise<EpisodeMatch> => {
      let result: MatchEpisodeResult
      try {
        result = (await mutation.mutateAsync(input)).data
      } catch (error) {
        const { message, ...action } = describeSourceError({
          error,
          describeFailure: (reason) =>
            t(
              'integration.alert.matchError',
              'Failed to match episode: {{message}}',
              { message: reason }
            ),
        })
        return { status: 'failed', message, action }
      }

      switch (result.status) {
        case 'success':
          return { status: 'matched', episode: result.data }
        case 'disambiguation':
          return { status: 'ambiguous', seasons: result.data }
        case 'notFound':
          Logger.info(`No episode matched for ${input.title}`, result.cause)
          return {
            status: 'failed',
            message: t(
              'integration.alert.noEpisodeFound',
              'No episode found for {{title}}',
              { title: input.title }
            ),
            action: {
              actionFn: () => open({ tab: PopupTab.Search }),
              actionLabel: t(
                'integration.alert.openSearch',
                'Open search page'
              ),
            },
          }
      }
    }
  )

  return { match, isPending: mutation.isPending }
}
