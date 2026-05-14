import { xmlToJSON } from '@danmaku-anywhere/danmaku-converter'
import { decodeBilibiliDanmakuProto } from '@danmaku-anywhere/danmaku-provider/bilibili'
import { useMutation } from '@tanstack/react-query'

import type { DanmakuImportData } from '@/common/danmaku/dto'
import { useInvalidateSeasonAndEpisode } from '@/common/hooks/useInvalidateSeasonAndEpisode'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const VALID_EXTENSIONS = ['.json', '.xml', '.bin'] as const

function getExtension(file: File): string {
  const idx = file.name.lastIndexOf('.')
  if (idx === -1) {
    return ''
  }
  return file.name.slice(idx).toLowerCase()
}

function isFileValid(file: File) {
  return (VALID_EXTENSIONS as readonly string[]).includes(getExtension(file))
}

async function parseFile(file: File): Promise<unknown> {
  const ext = getExtension(file)
  if (ext === '.bin') {
    const buffer = await file.arrayBuffer()
    return decodeBilibiliDanmakuProto(new Uint8Array(buffer))
  }
  const text = await file.text()
  if (ext === '.xml') {
    return xmlToJSON(text)
  }
  return JSON.parse(text)
}

export const useDanmakuImport = () => {
  const invalidateSeasonAndEpisode = useInvalidateSeasonAndEpisode()

  const { mutate, data, error, reset, isError, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      return Promise.all(
        files.filter(isFileValid).map(async (file) => {
          const data = await parseFile(file)
          return {
            title: file.name,
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
