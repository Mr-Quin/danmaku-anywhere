import { BiliGrpcAdapter, BiliXmlAdapter } from '@dan-uni/dan-any/adapters'
import type { UDanmaku } from '@dan-uni/dan-any/core'
import { useMutation } from '@tanstack/react-query'

import type { DanmakuImportData } from '@/common/danmaku/dto'
import { useInvalidateSeasonAndEpisode } from '@/common/hooks/useInvalidateSeasonAndEpisode'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createUniDB } from '@/common/services/UniDBService'

export const VALID_EXTENSIONS = ['.json', '.xml', '.bin'] as const

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

/**
 * Serialize UDanmaku to plain JSON object for RPC transfer.
 * Chrome message API cannot serialize Date objects, so convert to ISO strings.
 * Also ensure all fields are JSON-serializable (no undefined, functions, etc.)
 */
function serializeUDanmaku(danmaku: UDanmaku): Record<string, unknown> {
  return {
    DMID: danmaku.DMID,
    SOID: danmaku.SOID,
    attr: danmaku.attr,
    color: danmaku.color,
    content: danmaku.content,
    ctime:
      danmaku.ctime instanceof Date
        ? danmaku.ctime.toISOString()
        : danmaku.ctime,
    extra: danmaku.extra ? JSON.parse(JSON.stringify(danmaku.extra)) : null,
    fontsize: danmaku.fontsize,
    mode: danmaku.mode,
    platform: danmaku.platform,
    pool: danmaku.pool,
    progress: danmaku.progress,
    senderID: danmaku.senderID,
    weight: danmaku.weight,
  }
}

/**
 * Parse danmaku file directly to UDanmaku[] using dan-any adapters.
 * No intermediate JSON format - parse once in the frontend.
 */
async function parseFile(file: File): Promise<UDanmaku[]> {
  const ext = getExtension(file)
  const udb = createUniDB()
  const chunk = await udb.makeChunk({})

  if (ext === '.bin') {
    // Bilibili protobuf format
    const buffer = await file.arrayBuffer()
    await chunk.import(BiliGrpcAdapter(buffer))
  } else if (ext === '.xml') {
    // Bilibili XML format
    const text = await file.text()
    await chunk.import(BiliXmlAdapter(text))
  } else if (ext === '.json') {
    // JSON format - could be DanDanPlay, Tencent, or custom format
    // For now, treat as custom format (array of CommentEntity)
    const text = await file.text()
    const json = JSON.parse(text)

    // If it's an array of CommentEntity objects, use V4EpisodeAdapter
    if (Array.isArray(json)) {
      const { V4EpisodeAdapter } = await import(
        '@danmaku-anywhere/danmaku-converter'
      )
      const adapter = V4EpisodeAdapter({
        comments: json,
        commentCount: json.length,
      } as any)
      await adapter(udb, chunk)
    } else {
      throw new Error('Unsupported JSON format')
    }
  } else {
    throw new Error(`Unsupported file extension: ${ext}`)
  }

  // Extract UDanmaku array from chunk
  return chunk.$danmakus
}

export const useDanmakuImport = () => {
  const invalidateSeasonAndEpisode = useInvalidateSeasonAndEpisode()

  const { mutate, data, error, reset, isError, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      return Promise.all(
        files.filter(isFileValid).map(async (file) => {
          const danmakus = await parseFile(file)

          // Serialize danmakus for RPC transfer (convert Date to ISO string)
          const serializedDanmakus = danmakus.map(serializeUDanmaku)

          return {
            title: file.name,
            danmakus: serializedDanmakus,
            metadata: {
              originalFileName: file.name,
              source:
                getExtension(file) === '.bin'
                  ? ('bilibili-grpc' as const)
                  : getExtension(file) === '.xml'
                    ? ('bilibili-xml' as const)
                    : ('custom-json' as const),
            },
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
