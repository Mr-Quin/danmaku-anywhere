import { BiliXmlTransformerConfigurator } from '@dan-uni/dan-any/adapters'
import type { UDanmaku } from '@dan-uni/dan-any/core'
import { UniDB } from '@dan-uni/dan-any/core/main/pure'
import { i18n } from '@/common/localization/i18n'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { type ExportFormatter, useExportWithFormat } from './useExportBase'

/**
 * Deserialize UDanmaku from RPC: convert ISO date strings back to Date objects
 */
function deserializeUDanmaku(serialized: Record<string, unknown>): UDanmaku {
  return {
    ...serialized,
    ctime:
      typeof serialized.ctime === 'string'
        ? new Date(serialized.ctime)
        : (serialized.ctime as Date),
  } as UDanmaku
}

const xmlFormatter: ExportFormatter = {
  formatEpisode: async (episode) => {
    // V5: Load UDanmaku[] from chunk via RPC
    const { data: udanmakus } = await chromeRpcClient.episodeGetComments({
      episodeId: episode.id,
      isCustom: !('season' in episode),
    })

    // Deserialize: RPC transfers Date as ISO string, need to convert back
    const deserializedDanmakus = udanmakus.map(deserializeUDanmaku)

    // Create a temporary UniDB and chunk for export
    const udb = await new UniDB().init()
    try {
      const chunk = await udb.makeChunk({})

      // Insert UDanmaku[] into the chunk
      await chunk.upsertDanmakus(deserializedDanmakus, false)

      // Export to Bilibili XML format using dan-any transformer
      const xmlContent = await chunk.export(BiliXmlTransformerConfigurator())

      return {
        name: `${episode.title}.xml`,
        data: xmlContent,
      }
    } finally {
      await udb.close()
    }
  },
  fileExtension: 'xml',
  successMessage: () =>
    i18n.t('danmaku.alert.xmlExported', 'Export XML successful'),
  errorMessage: (errorMessage: string) =>
    i18n.t(
      'danmaku.alert.xmlExportError',
      'Failed to export XML: {{message}}',
      {
        message: errorMessage,
      }
    ),
}

export const useExportXml = () => {
  return useExportWithFormat(xmlFormatter)
}
