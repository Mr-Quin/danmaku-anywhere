import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

export const useMatchEpisode = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()
  const { open, setAnimes } = usePopup()

  const mutation = useMutation({
    mutationFn: (input: MatchEpisodeInput) => {
      return chromeRpcClient.episodeMatch(input)
    },
    onError: (e) => {
      toast.error(
        t(
          'integration.alert.matchError',
          'Failed to match episode: {{message}}',
          {
            message: e.message,
          }
        )
      )
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
          toast.error(
            t(
              'integration.alert.noEpisodeMatched',
              'No episode matched for {{title}}: {{cause}}',
              { title: v.title, cause: result.data.cause }
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
