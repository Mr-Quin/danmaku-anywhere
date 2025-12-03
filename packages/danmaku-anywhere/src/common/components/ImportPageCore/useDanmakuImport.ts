import { xmlToJSON } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'

import type { DanmakuImportData } from '@/common/danmaku/dto'
import { useInvalidateSeasonAndEpisode } from '@/common/hooks/useInvalidateSeasonAndEpisode'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { stripExtension } from '@/common/utils/stripExtension'

const VALID_FILE_TYPES = [
  'application/json',
  'application/xml',
  'text/xml',
  'text/json',
]

const isFileValid = (file: File) => {
  return VALID_FILE_TYPES.includes(file.type)
}

const getJson = async (file: File) => {
  const text = await file.text()
  const data: unknown = file.type.includes('xml')
    ? xmlToJSON(text)
    : JSON.parse(text)
  return data
}

export const useDanmakuImport = () => {
  const invalidateSeasonAndEpisode = useInvalidateSeasonAndEpisode()

  const { mutate, data, error, reset, isError, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      return Promise.all(
        files.filter(isFileValid).map(async (file) => {
          const data = await getJson(file)
          return {
            title: stripExtension(file.name),
            data,
          } satisfies DanmakuImportData
        })
      )
    },
  })

  const handleImportClick = async () => {
    if (!data || data.length === 0) {
      throw new Error('No files to import')
    }

    const { data: results } = await chromeRpcClient.episodeImport(data)

    invalidateSeasonAndEpisode()

    return results
  }

  return {
    handleImportClick,
    mutate,
    data,
    error,
    reset,
    isError,
    isPending,
  }
}
