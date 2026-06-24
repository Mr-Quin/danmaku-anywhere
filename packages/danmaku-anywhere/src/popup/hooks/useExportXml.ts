import {
  commentsToXml,
  toCommentEntity,
} from '@danmaku-anywhere/danmaku-converter'
import { i18n } from '@/common/localization/i18n'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { type ExportFormatter, useExportWithFormat } from './useExportBase'

const xmlFormatter: ExportFormatter = {
  formatEpisode: async (episode) => {
    // V5: Load UDanmaku[] from chunk via RPC
    const { data: udanmakus } = await chromeRpcClient.episodeGetComments({
      episodeId: episode.id,
      isCustom: !('season' in episode),
    })

    // Convert UDanmaku[] to CommentEntity[] for XML export
    const comments = udanmakus.map((u) => toCommentEntity(u))

    const xmlContent = commentsToXml(comments)
    return {
      name: `${episode.title}.xml`,
      data: xmlContent,
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
