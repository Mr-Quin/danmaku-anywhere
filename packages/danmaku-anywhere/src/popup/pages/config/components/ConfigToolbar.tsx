import { combinedPolicyService } from '@/common/options/combinedPolicy'
import { downloadZip, sanitizeFilename } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabToolbar } from '@/content/common/TabToolbar'
import {
  AddCircle,
  Description,
  Download,
  Edit,
  GitHub,
  Visibility,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

type ConfigToolbarProps = {
  onOpenAdd: () => void
  onOpenImport: (kind: 'repo' | 'file') => void
  onShowIntegration: () => void
}

export const ConfigToolbar = ({
  onOpenAdd,
  onOpenImport,
  onShowIntegration,
}: ConfigToolbarProps) => {
  const { t } = useTranslation()

  const exportAll = useMutation({
    mutationFn: async () => {
      const configs = await combinedPolicyService.exportAll()
      await downloadZip(
        'configs',
        configs.map((config) => {
          return {
            name: `${sanitizeFilename(config.name)}.json`,
            data: JSON.stringify(config, null, 2),
          }
        })
      )
    },
  })

  return (
    <TabToolbar title={t('configPage.name')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary' }}
        items={[
          {
            id: 'add',
            label: t('configPage.createConfig'),
            onClick: onOpenAdd,
            icon: <Edit />,
          },
          {
            id: 'importRepo',
            label: t('configPage.import.fromRepo'),
            icon: <GitHub />,
            onClick: () => onOpenImport('repo'),
          },
          {
            id: 'importFile',
            label: t('configPage.import.fromFile'),
            icon: <Description />,
            onClick: () => onOpenImport('file'),
          },
        ]}
      />
      <DrilldownMenu
        ButtonProps={{ edge: 'end' }}
        items={[
          {
            id: 'export',
            label: t('configPage.exportAll'),
            onClick: () => exportAll.mutate(),
            loading: exportAll.isPending,
            icon: <Download />,
          },
          {
            id: 'showIntegration',
            label: t('configPage.showIntegration'),
            onClick: onShowIntegration,
            icon: <Visibility />,
          },
        ]}
      />
    </TabToolbar>
  )
}
