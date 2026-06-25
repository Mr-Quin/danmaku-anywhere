import {
  type Adapter,
  ArtplayerAdapter,
  ArtplayerMetadata,
  BiliCommandGrpcAdapter,
  BiliCommandGrpcMetadata,
  BiliGrpcAdapter,
  BiliGrpcMetadata,
  BiliUpAdapter,
  BiliUpMetadata,
  BiliXmlAdapter,
  BiliXmlMetadata,
  DanuniJsonAdapter,
  DanuniJsonMetadata,
  DanuniPbAdapter,
  DanuniPbMetadata,
  DdplayAdapter,
  DdplayMetadata,
  DplayerAdapter,
  DplayerMetadata,
  type Metadata,
  TencentAdapter,
  TencentMetadata,
  VodAdapter,
  VodMetadata,
} from '@dan-uni/dan-any/adapters'
import { type UDanmaku, UniChunk } from '@dan-uni/dan-any/core'
import { fileParser, WildcardAdapterUtil } from '@dan-uni/dan-any/utils'
import { useMutation } from '@tanstack/react-query'

import type { DanmakuImportData } from '@/common/danmaku/dto'
import { useInvalidateSeasonAndEpisode } from '@/common/hooks/useInvalidateSeasonAndEpisode'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createUniDB } from '@/common/services/UniDBService'

// Build handlerList for WildcardAdapterUtil
const handlerList: [Metadata, Adapter][] = [
  [BiliXmlMetadata, BiliXmlAdapter],
  [BiliGrpcMetadata, BiliGrpcAdapter],
  [BiliCommandGrpcMetadata, BiliCommandGrpcAdapter],
  [BiliUpMetadata, BiliUpAdapter],
  [DanuniJsonMetadata, DanuniJsonAdapter],
  [DanuniPbMetadata, DanuniPbAdapter],
  [ArtplayerMetadata, ArtplayerAdapter],
  [DplayerMetadata, DplayerAdapter],
  [DdplayMetadata, DdplayAdapter],
  [TencentMetadata, TencentAdapter],
  [VodMetadata, VodAdapter],
]

// Support all common danmaku formats
export const VALID_EXTENSIONS = [
  ...new Set(handlerList.flatMap(([metadata]) => metadata.ext)),
]

function getExtension(file: File): string {
  const idx = file.name.lastIndexOf('.')
  if (idx === -1) {
    return ''
  }
  return file.name.slice(idx).toLowerCase()
}

function isFileValid(file: File) {
  return VALID_EXTENSIONS.includes(getExtension(file))
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
 * Parse danmaku file using dan-any WildcardAdapterUtil.
 * Automatically detects format and uses appropriate adapter.
 * Supports all formats registered in handlerList.
 */
async function parseFile(file: File): Promise<UDanmaku[]> {
  const udb = createUniDB()
  const chunk = await udb.makeChunk({})

  // Use WildcardAdapterUtil to automatically detect and import
  const result = await WildcardAdapterUtil(chunk, handlerList, file)

  if (result === null)
    throw new Error(`Unsupported danmaku file format: ${file.name}`)

  if (result instanceof UniChunk) return chunk.$danmakus

  const adapter = result
  if (adapter === ArtplayerAdapter)
    chunk.import(ArtplayerAdapter(await fileParser(file, 'json')))
  else if (adapter === DplayerAdapter)
    chunk.import(DplayerAdapter(await fileParser(file, 'json')))
  else if (adapter === DdplayAdapter)
    chunk.import(DdplayAdapter(await fileParser(file, 'json')))
  else if (adapter === TencentAdapter)
    chunk.import(TencentAdapter(await fileParser(file, 'json')))
  else if (adapter === VodAdapter)
    chunk.import(VodAdapter(await fileParser(file, 'json')))
  else throw new Error(`Unsupported danmaku adapter: ${adapter.name}`)

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
              source: 'auto-detected' as const, // wildcardAdapterUtil auto-detects
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
