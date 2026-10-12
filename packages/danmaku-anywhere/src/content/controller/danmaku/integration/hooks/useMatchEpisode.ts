import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { useSourceErrorToast } from './useSourceErrorToast'

export const useMatchEpisode = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()
  const { open, setAnimes } = usePopup()
  const showSourceError = useSourceErrorToast()

  const mutation = useMutation({
    mutationFn: (input: MatchEpisodeInput) => {
      return chromeRpcClient.episodeMatch(input)
    },
    onError: (e) => {
      showSourceError({
        error: e,
        fallbackMessage: t(
          'integration.alert.matchError',
          'Failed to match episode: {{message}}',
          {
            message: e.message,
          }
        ),
      })
    },
    onSuccess: (result, v) => {
      switch (result.data.status) {
        case 'success': {
          break
        }
        case 'disambiguation': {
          const anime = result.data.data
          setAnimes(anime)
          open({ animes: anime, tab: PopupTab.Selector })
          break
        }
        case 'notFound':
          Logger.info(`No episode matched for ${v.title}`, result.data.cause)
          toast.error(
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
