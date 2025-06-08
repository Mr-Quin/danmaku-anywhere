import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useMatchEpisode = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()

  const mutation = useMutation({
    mutationFn: chromeRpcClient.episodeMatch,
    onError: (_, v) => {
      toast.error(
        t('integration.alert.searchError', {
          message: v.title,
        })
      )
    },
    retry: false,
  })

  return mutation
}
