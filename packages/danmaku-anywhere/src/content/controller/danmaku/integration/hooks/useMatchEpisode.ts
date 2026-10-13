import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { episodeToast } from '@/content/controller/danmaku/integration/episodeToast'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { useDescribeSourceError } from './useDescribeSourceError'

export const useMatchEpisode = () => {
  const { t } = useTranslation()

  const { open, setAnimes } = usePopup()
  const describeSourceError = useDescribeSourceError()

  const mutation = useMutation({
    mutationFn: (input: MatchEpisodeInput) => {
      return chromeRpcClient.episodeMatch(input)
    },
    onError: (e) => {
      const { message, ...action } = describeSourceError({
        error: e,
        describeFailure: (reason) =>
          t(
            'integration.alert.matchError',
            'Failed to match episode: {{message}}',
            { message: reason }
          ),
      })
      episodeToast.fail(message, action)
    },
    onSuccess: (result, v) => {
      switch (result.data.status) {
        case 'success': {
          break
        }
        case 'disambiguation': {
          const anime = result.data.data
          episodeToast.dismiss()
          setAnimes(anime)
          open({ animes: anime, tab: PopupTab.Selector })
          break
        }
        case 'notFound':
          Logger.info(`No episode matched for ${v.title}`, result.data.cause)
          episodeToast.fail(
            t(
              'integration.alert.noEpisodeFound',
              'No episode found for {{title}}',
              { title: v.title }
            ),
            {
              actionFn: () => open({ tab: PopupTab.Search }),
              actionLabel: t(
                'integration.alert.openSearch',
                'Open search page'
              ),
            }
          )
          break
      }
    },
    retry: false,
  })

  return mutation
}
