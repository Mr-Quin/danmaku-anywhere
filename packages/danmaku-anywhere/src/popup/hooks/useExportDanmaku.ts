import { type ExportFormatter, useExportWithFormat } from './useExportBase'

const jsonFormatter: ExportFormatter = {
  formatEpisode: (episode: any) => ({
    name: `${episode.title}.json`,
    data: JSON.stringify(episode, null, 2),
  }),
  fileExtension: 'json',
  successMessageKey: 'danmaku.alert.exported',
  errorMessageKey: 'danmaku.alert.exportError',
}

export const useExportDanmaku = () => {
  return useExportWithFormat(jsonFormatter)
}
