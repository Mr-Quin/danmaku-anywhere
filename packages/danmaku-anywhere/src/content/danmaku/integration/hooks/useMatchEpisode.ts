import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useLoadDanmaku } from '@/content/common/hooks/useLoadDanmaku'
import { PopupTab, usePopup } from '@/content/store/popupStore'
import { useStore } from '@/content/store/store'

export const useMatchEpisode = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()
  const { open, setAnimes } = usePopup()

  const { resetMediaState } = useStore(useShallow((state) => state))

  const fetchDanmakuMutation = useLoadDanmaku()

  const mutation = useMutation({
    mutationFn: chromeRpcClient.episodeMatch,
    onError: (_, v) => {
      resetMediaState()
      toast.error(
        t('integration.alert.searchError', {
          message: v.title,
        })
      )
    },
    onSuccess: (result, v) => {
      switch (result.status) {
        case 'success': {
          fetchDanmakuMutation.mutate(
            {
              meta: result.data,
              options: {
                forceUpdate: false,
              },
              context: {
                key: v.mapKey,
              },
            },
            {
              onError: () => {
                resetMediaState()
                toast.error(
                  t('danmaku.alert.fetchError', {
                    message: v.title,
                  })
                )
              },
            }
          )
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
            t('integration.alert.searchResultEmpty', { title: v.title }),
            {
              actionFn: () => open({ tab: PopupTab.Search }),
              actionLabel: t('integration.alert.openSearch'),
            }
          )
          break
      }
    },
    retry: false,
  })

  return mutation
}
