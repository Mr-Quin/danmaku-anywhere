import { DanuniJsonTransformerConfigurator } from '@dan-uni/dan-any/adapters'
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

const jsonFormatter: ExportFormatter = {
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

      // Export to DanUni JSON format using dan-any transformer
      const jsonContent = await chunk.export(
        DanuniJsonTransformerConfigurator({
          minify: false, // Pretty-printed for readability
        })
      )

      return {
        name: `${episode.title}.json`,
        data: JSON.stringify(jsonContent),
      }
    } finally {
      await udb.close()
    }
  },
  fileExtension: 'json',
  successMessage: () => i18n.t('danmaku.alert.exported', 'Export successful'),
  errorMessage: (errorMessage: string) =>
    i18n.t('danmaku.alert.exportError', 'Export failed: {{message}}', {
      message: errorMessage,
    }),
}

export const useExportDanmaku = () => {
  return useExportWithFormat(jsonFormatter)
}
