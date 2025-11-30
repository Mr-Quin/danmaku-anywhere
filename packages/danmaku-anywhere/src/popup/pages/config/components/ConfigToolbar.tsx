import {
  AddCircle,
  Download,
  Edit,
  Upload,
  Visibility,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import { downloadZip, sanitizeFilename } from '@/common/utils/utils'

type ConfigToolbarProps = {
  onAdd: () => void
  onShowIntegration: () => void
}

export const ConfigToolbar = ({
  onAdd,
  onShowIntegration,
}: ConfigToolbarProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

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

  const handleImportConfigs = async () => {
    navigate('import')
  }

  return (
    <TabToolbar title={t('configPage.name', 'Configs')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary' }}
        items={[
          {
            id: 'add',
            label: t('configPage.createConfig', 'Create Config'),
            onClick: onAdd,
            icon: <Edit />,
          },
          {
            id: 'import',
            label: t('configPage.import.name', 'Import Config'),
            icon: <Upload />,
            onClick: handleImportConfigs,
          },
        ]}
      />
      <DrilldownMenu
        ButtonProps={{ edge: 'end' }}
        items={[
          {
            id: 'export',
            label: t('configPage.backupAll', 'Backup All'),
            onClick: () => exportAll.mutate(),
            loading: exportAll.isPending,
            icon: <Download />,
          },
          {
            id: 'showIntegration',
            label: t('configPage.showIntegration', 'View Integration Policy'),
            onClick: onShowIntegration,
            icon: <Visibility />,
          },
        ]}
      />
    </TabToolbar>
  )
}
