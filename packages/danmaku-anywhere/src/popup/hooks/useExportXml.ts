import { commentsToXml } from '@danmaku-anywhere/danmaku-converter'
import { type ExportFormatter, useExportWithFormat } from './useExportBase'

const xmlFormatter: ExportFormatter = {
  formatEpisode: (episode) => {
    const formattedComments = episode.comments.map((comment) => ({
      p: comment.p,
      m: comment.m,
    }))

    const xmlContent = commentsToXml(formattedComments)
    return {
      name: `${episode.title}.xml`,
      data: xmlContent,
    }
  },
  fileExtension: 'xml',
  successMessageKey: 'danmaku.alert.xmlExported',
  errorMessageKey: 'danmaku.alert.xmlExportError',
}

export const useExportXml = () => {
  return useExportWithFormat(xmlFormatter)
}
