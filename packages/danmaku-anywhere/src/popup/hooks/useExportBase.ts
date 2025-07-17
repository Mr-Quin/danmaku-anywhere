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

export type ExportData =
  | {
      isCustom: false
      filter: EpisodeQueryFilter
    }
  | {
      isCustom: true
      filter: CustomEpisodeQueryFilter
    }

export interface ExportFile {
  name: string
  data: string
}

export interface ExportFormatter {
  formatEpisode: (episode: any) => ExportFile
  fileExtension: string
  successMessageKey: string
  errorMessageKey: string
}

export const useExportWithFormat = (formatter: ExportFormatter) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast.use.toast()

  const fetchEpisodes = async (data: ExportData) => {
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

  const fetchAllEpisodes = async () => {
    const { data: episodes } = await chromeRpcClient.episodeFilter({
      all: true,
    })
    const { data: customEpisodes } = await chromeRpcClient.episodeFilterCustom({
      all: true,
    })
    return { episodes, customEpisodes }
  }

  const fetchEpisodesByAnime = async (seasonId: number) => {
    const { data } = await chromeRpcClient.episodeFilter({ seasonId })
    return data
  }

  const handleSuccess = () => {
    toast.success(t(formatter.successMessageKey))
  }

  const handleError = (e: Error) => {
    toast.error(t(formatter.errorMessageKey, { message: e.message }))
  }

  const exportAll = useMutation({
    mutationFn: async () => {
      const { episodes, customEpisodes } = await fetchAllEpisodes()

      const files: ExportFile[] = episodes
        .map((ep) => {
          const formatted = formatter.formatEpisode(ep)
          return {
            name: `${ep.season.title}/${sanitizeFilename(formatted.name)}`,
            data: formatted.data,
          }
        })
        .concat(
          customEpisodes.map((ep) => {
            const formatted = formatter.formatEpisode(ep)
            return {
              name: `custom/${sanitizeFilename(formatted.name)}`,
              data: formatted.data,
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
      const data = await fetchEpisodesByAnime(seasonId)

      if (data && data.length > 0) {
        await downloadZip(
          `${data[0].season.title}`,
          data.map((ep) => {
            const formatted = formatter.formatEpisode(ep)
            return {
              name: sanitizeFilename(formatted.name),
              data: formatted.data,
            }
          })
        )
      }
    },
    onSuccess: handleSuccess,
    onError: handleError,
  })

  const exportMany = useMutation({
    mutationFn: async (data: ExportData) => {
      const episodes = await fetchEpisodes(data)

      if (episodes && episodes.length > 0) {
        await downloadZip(
          `${episodes[0].title}-collection`,
          episodes.map((ep) => {
            const formatted = formatter.formatEpisode(ep)
            return {
              name: sanitizeFilename(formatted.name),
              data: formatted.data,
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
