import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { bookmarkQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useBookmarkRefresh = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => chromeRpcClient.bookmarkRefresh({ id }),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      void queryClient.invalidateQueries({
        queryKey: bookmarkQueryKeys.all(),
      })
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}
