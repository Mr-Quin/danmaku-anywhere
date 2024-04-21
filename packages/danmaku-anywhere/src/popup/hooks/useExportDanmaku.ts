import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/toast/toastStore'
import { chromeRpcClient } from '@/common/rpc/client'
import { createDownload } from '@/common/utils/utils'

export const useExportDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const exportDanmaku = async () => {
    const danmakuList = await chromeRpcClient.danmakuGetAll()

    await createDownload(
      new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    )
  }

  const mutation = useMutation({
    mutationFn: exportDanmaku,
    onSuccess: () => {
      toast.success(t('danmaku.alert.exported'))
    },
    onError: (e) => {
      toast.error(t('danmaku.alert.exportError', { message: e.message }))
    },
  })

  return mutation
}
