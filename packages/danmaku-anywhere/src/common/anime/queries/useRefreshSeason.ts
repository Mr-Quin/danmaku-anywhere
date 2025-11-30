import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useRefreshSeason = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: seasonQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.seasonRefresh({ id }),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      void queryClient.invalidateQueries({
        queryKey: seasonQueryKeys.all(),
      })
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}
