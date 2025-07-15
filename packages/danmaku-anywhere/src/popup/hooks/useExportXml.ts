import { commentsToXml } from '@danmaku-anywhere/danmaku-converter'
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
import { sanitizeFilename } from '@/common/utils/utils'

export type ExportXmlData =
  | {
      isCustom: false
      filter: EpisodeQueryFilter
    }
  | {
      isCustom: true
      filter: CustomEpisodeQueryFilter
    }

const downloadXmlFile = (xmlContent: string, filename: string) => {
  const blob = new Blob([xmlContent], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export const useExportXml = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast.use.toast()

  const handleSuccess = () => {
    toast.success(t('danmaku.alert.xmlExported'))
  }

  const handleError = (e: Error) => {
    toast.error(t('danmaku.alert.xmlExportError', { message: e.message }))
  }

  const exportXml = useMutation({
    mutationFn: async (data: ExportXmlData) => {
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
        for (const episode of episodes) {
          // Convert episode comments to the format expected by commentsToXml
          const formattedComments = episode.comments.map((comment) => ({
            p: comment.p,
            m: comment.m,
          }))

          const xmlContent = commentsToXml(formattedComments)
          const filename =
            episodes.length === 1
              ? `${episode.title}.xml`
              : `${episode.title}.xml`

          downloadXmlFile(xmlContent, filename)
        }
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  return {
    exportXml,
  }
}
