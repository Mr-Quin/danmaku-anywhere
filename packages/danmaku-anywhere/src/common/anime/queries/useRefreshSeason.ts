import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useRefreshSeason = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: seasonQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.seasonRefresh({ id }),
    onSuccess: () => {
      toast.success(t('common.success'))
    },
    onError: () => {
      toast.error(t('common.failed'))
    },
  })
}
