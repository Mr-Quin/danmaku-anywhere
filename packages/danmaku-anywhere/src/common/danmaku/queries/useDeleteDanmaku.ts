import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuDeleteDto } from '@/common/danmaku/dto'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDeleteDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: danmakuQueryKeys.all(),
    mutationFn: async (danmakuId: DanmakuDeleteDto) => {
      await chromeRpcClient.danmakuDelete(danmakuId)
    },
    onError: (e) => {
      toast.error(
        t('danmaku.alert.deleteError', {
          message: e.message,
        })
      )
    },
    onSuccess: () => {
      toast.success(t('danmaku.alert.deleted'))
    },
  })
}
