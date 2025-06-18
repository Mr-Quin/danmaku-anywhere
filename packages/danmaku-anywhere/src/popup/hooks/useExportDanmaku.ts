import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type {
  CustomEpisodeQueryFilter,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { downloadZip, sanitizeFilename } from '@/common/utils/utils'

export type ExportDanmakuData =
  | {
      isCustom: false
      filter: EpisodeQueryFilter
    }
  | {
      isCustom: true
      filter: CustomEpisodeQueryFilter
    }

export const useExportDanmaku = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast.use.toast()

  const handleSuccess = () => {
    toast.success(t('danmaku.alert.exported'))
  }

  const handleError = (e: Error) => {
    toast.error(t('danmaku.alert.exportError', { message: e.message }))
  }

  const exportAll = useMutation({
    mutationFn: async () => {
      const { data: episodes } = await chromeRpcClient.episodeFilter({
        all: true,
      })
      const { data: customEpisodes } =
        await chromeRpcClient.episodeFilterCustom({
          all: true,
        })

      const files = episodes
        .map((ep) => {
          return {
            name: `${ep.season.title}/${sanitizeFilename(ep.title)}.json`,
            data: JSON.stringify(ep, null, 2),
          }
        })
        .concat(
          customEpisodes.map((ep) => {
            return {
              name: `custom/${sanitizeFilename(ep.title)}.json`,
              data: JSON.stringify(ep, null, 2),
            }
          })
        )

      await downloadZip('all-danmaku-collection', files)
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportByAnime = useMutation({
    mutationFn: async (seasonId: number) => {
      const { data } = await chromeRpcClient.episodeFilter({ seasonId })

      if (data && data.length > 0) {
        await downloadZip(
          `${data[0].season.title}`,
          data.map((ep) => {
            return {
              name: `${ep.title}.json`,
              data: JSON.stringify(ep, null, 2),
            }
          })
        )
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportMany = useMutation({
    mutationFn: async (data: ExportDanmakuData) => {
      const getData = async () => {
        if (data.isCustom) {
          const { data: episodes } = await queryClient.fetchQuery({
            queryKey: customEpisodeQueryKeys.filter(data.filter),
            queryFn: () => chromeRpcClient.episodeFilterCustom(data.filter),
          })

          return episodes
        }
        const { data: episodes } = await queryClient.fetchQuery({
          queryKey: episodeQueryKeys.filter(data.filter),
          queryFn: () => chromeRpcClient.episodeFilter(data.filter),
        })

        return episodes
      }

      const episodes = await getData()

      if (episodes && episodes.length > 0) {
        await downloadZip(
          `${episodes[0].title}-collection`,
          episodes.map((ep) => {
            return {
              name: `${ep.title}.json`,
              data: JSON.stringify(ep, null, 2),
            }
          })
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
