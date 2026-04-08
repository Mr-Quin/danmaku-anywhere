import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useRefreshSeason = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: (id: number) => chromeRpcClient.seasonRefresh({ id }),
    meta: {
      invalidates: [seasonQueryKeys.all()],
    },
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}
