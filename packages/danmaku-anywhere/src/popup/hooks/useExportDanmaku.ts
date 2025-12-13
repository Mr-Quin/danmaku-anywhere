import { i18n } from '@/common/localization/i18n'
import { type ExportFormatter, useExportWithFormat } from './useExportBase'

const jsonFormatter: ExportFormatter = {
  formatEpisode: (episode) => ({
    name: `${episode.title}.json`,
    data: JSON.stringify(episode, null, 2),
  }),
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
