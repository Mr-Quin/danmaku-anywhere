import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { bookmarkQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useBookmarkAdd = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: (seasonId: number) => chromeRpcClient.bookmarkAdd({ seasonId }),
    meta: {
      invalidates: [bookmarkQueryKeys.all()],
    },
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}
