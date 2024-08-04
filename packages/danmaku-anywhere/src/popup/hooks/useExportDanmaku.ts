import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { danmakuMetaToString } from '@/common/danmaku/utils'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createDownload } from '@/common/utils/utils'

export const useExportDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const exportDanmaku = async (meta?: DanmakuMeta) => {
    if (meta) {
      const res = await chromeRpcClient.danmakuGetOne({
        type: meta.type,
        id: meta.episodeId,
      })

      if (res) {
        await createDownload(
          new Blob([JSON.stringify([res])], { type: 'text/json' }),
          `${danmakuMetaToString(meta)}.json`
        )
      }
      return
    }
    const danmakuList = await chromeRpcClient.danmakuGetAll()

    await createDownload(
      new Blob([JSON.stringify(danmakuList)], { type: 'text/json' }),
      `danmaku-${new Date().toISOString()}.json`
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
