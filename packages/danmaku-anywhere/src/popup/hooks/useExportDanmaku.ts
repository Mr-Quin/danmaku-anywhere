import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type {
  DanmakuGetByAnimeDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import { danmakuMetaToString } from '@/common/danmaku/utils'
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
      const danmakuList = await chromeRpcClient.danmakuGetAll()

      await createDownload(
        new Blob([JSON.stringify(danmakuList)], { type: 'text/json' }),
        `all-danmaku.json`
      )
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportByAnime = useMutation({
    mutationFn: async (option: DanmakuGetByAnimeDto) => {
      const res = await chromeRpcClient.danmakuGetByAnime({
        type: option.type,
        id: option.id,
      })

      if (res) {
        const animeTitle = res[0].meta.animeTitle

        await createDownload(
          new Blob([JSON.stringify(res)], { type: 'text/json' }),
          `${animeTitle}.json`
        )
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportMany = useMutation({
    mutationFn: async (option: DanmakuGetOneDto[]) => {
      const res = await chromeRpcClient.danmakuGetMany(option)

      if (res.length > 0) {
        const fileName =
          res.length > 1
            ? res[0].meta.animeTitle
            : danmakuMetaToString(res[0].meta)

        await createDownload(
          new Blob([JSON.stringify(res)], { type: 'text/json' }),
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
