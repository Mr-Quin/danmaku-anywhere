import { Download } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useExportXml } from '@/popup/hooks/useExportXml'

export const ExportAllDanmakuButton = () => {
  const exportDanmaku = useExportDanmaku()
  const exportXml = useExportXml()
  const { data, isFetching } = useEpisodesLiteSuspense()
  const { t } = useTranslation()

  const isDisabled = data.length === 0 || isFetching

  return (
    <DrilldownMenu
      ButtonProps={{
        edge: 'end',
      }}
      items={[
        {
          id: 'backup',
          label: t('danmakuPage.backupAll'),
          icon: <Download />,
          onClick: () =>
            exportDanmaku.mutate({
              filter: { all: true },
              customFilter: { all: true },
            }),
          disabled: isDisabled || exportDanmaku.isPending,
          loading: isFetching || exportDanmaku.isPending,
        },
        {
          id: 'exportXml',
          label: t('danmakuPage.exportAllXml'),
          icon: <Download />,
          onClick: () =>
            exportXml.mutate({
              filter: { all: true },
              customFilter: { all: true },
            }),
          disabled: isDisabled || exportXml.isPending,
          loading: isFetching || exportXml.isPending,
        },
      ]}
    />
  )
}
