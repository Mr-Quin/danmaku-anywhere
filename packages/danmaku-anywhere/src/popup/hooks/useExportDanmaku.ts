import { useMutation } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { createDownload } from '@/common/utils'

export const useExportDanmaku = () => {
  const exportDanmaku = async () => {
    const danmakuList = await danmakuMessage.getAll({})

    await createDownload(
      new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    )
  }

  const mutation = useMutation({
    mutationFn: exportDanmaku,
  })

  return mutation
}
