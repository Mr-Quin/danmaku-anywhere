import { useMutation } from '@tanstack/react-query'

import { useToast } from '@/common/components/toast/toastStore'
import { chromeRpcClient } from '@/common/rpc/client'
import { createDownload } from '@/common/utils'

export const useExportDanmaku = () => {
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
      toast.success('Danmaku exported')
    },
    onError: () => {
      toast.error('Failed to export danmaku')
    },
  })

  return mutation
}
