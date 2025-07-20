import type {
  CustomEpisode,
  Episode,
  GenericEpisode,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
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
import {
  createDownload,
  downloadZip,
  sanitizeFilename,
} from '@/common/utils/utils'

export type ExportFilter = {
  filter?: EpisodeQueryFilter
  customFilter?: CustomEpisodeQueryFilter
}

export interface ExportFile {
  name: string
  data: string
}

export interface ExportFormatter {
  formatEpisode: (episode: GenericEpisode) => ExportFile
  fileExtension: string
  successMessageKey: string
  errorMessageKey: string
}

const downloadSingleFile = (file: ExportFile) => {
  const blob = new Blob([file.data], { type: 'text/plain' })
  void createDownload(blob, file.name)
}

export const useExportWithFormat = (formatter: ExportFormatter) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast.use.toast()

  const exportEpisodes = useMutation({
    mutationFn: async ({ filter, customFilter }: ExportFilter) => {
      let episodes: WithSeason<Episode>[] = []
      let customEpisodes: CustomEpisode[] = []

      if (customFilter) {
        const { data: fetchedEpisodes } = await queryClient.fetchQuery({
          queryKey: customEpisodeQueryKeys.filter(customFilter),
          queryFn: () => chromeRpcClient.episodeFilterCustom(customFilter),
        })
        customEpisodes = fetchedEpisodes
      }

      if (filter) {
        const { data: fetchedEpisodes } = await queryClient.fetchQuery({
          queryKey: episodeQueryKeys.filter(filter),
          queryFn: () => chromeRpcClient.episodeFilter(filter),
        })
        episodes = fetchedEpisodes
      }

      const files: ExportFile[] = []

      // Add regular episodes
      episodes.forEach((ep) => {
        const formatted = formatter.formatEpisode(ep)
        const fileName = `${sanitizeFilename(ep.season.title)}/${sanitizeFilename(formatted.name)}`

        files.push({
          name: fileName,
          data: formatted.data,
        })
      })

      // Add custom episodes
      customEpisodes.forEach((ep) => {
        const formatted = formatter.formatEpisode(ep)
        files.push({
          name: `custom/${sanitizeFilename(formatted.name)}`,
          data: formatted.data,
        })
      })

      if (files.length === 1) {
        downloadSingleFile(files[0])
      } else if (files.length > 1) {
        const collectionName = `export-${new Date().toLocaleDateString()}-${new Date().toLocaleTimeString()}`
        await downloadZip(collectionName, files)
      }
    },
    onSuccess: () => {
      toast.success(t(formatter.successMessageKey))
    },
    onError: (e) => {
      toast.error(t(formatter.errorMessageKey, { message: e.message }))
    },
  })

  return exportEpisodes
}
