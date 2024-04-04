import { useMutation } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'
import { createDownload } from '@/common/utils'

export const useExportDanmaku = () => {
  const exportDanmaku = async () => {
    const danmakuList = await chromeRpcClient.danmakuGetAll()

    await createDownload(
      new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    )
  }

  const mutation = useMutation({
    mutationFn: exportDanmaku,
  })

  return mutation
}
