import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { danmakuToString } from '@/common/danmaku/utils'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createDownload } from '@/common/utils/utils'

export const useExportDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const handleSuccess = () => {
    toast.success(t('danmaku.alert.exported'))
  }

  const handleError = (e: Error) => {
    toast.error(t('danmaku.alert.exportError', { message: e.message }))
  }

  const exportAll = useMutation({
    mutationFn: async () => {
      const danmakuList = await chromeRpcClient.episodeGetAll()

      await createDownload(
        new Blob([JSON.stringify(danmakuList.data)], { type: 'text/json' }),
        `all-danmaku.json`
      )
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportByAnime = useMutation({
    mutationFn: async (seasonId: number) => {
      const { data } = await chromeRpcClient.episodeFilter({ seasonId })

      if (data) {
        const animeTitle = data[0].title

        await createDownload(
          new Blob([JSON.stringify(data)], { type: 'text/json' }),
          `${animeTitle}.json`
        )
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportMany = useMutation({
    mutationFn: async (option: number[]) => {
      const { data } = await chromeRpcClient.episodeGetMany(option)

      if (data.length > 0) {
        const fileName =
          data.length > 1 ? data[0].title : danmakuToString(data[0])

        await createDownload(
          new Blob([JSON.stringify(data)], { type: 'text/json' }),
          `${fileName}.json`
        )
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  return {
    exportAll,
    exportMany,
    exportByAnime,
  }
}
