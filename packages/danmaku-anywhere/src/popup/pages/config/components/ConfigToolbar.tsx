import { AddCircle, Download, Edit } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
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
    <TabToolbar title={t('configPage.name', 'Configs')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary', size: 'small' }}
        dense
        items={[
          {
            id: 'add',
            label: t('configPage.createConfig', 'Create Config'),
            onClick: onAdd,
            icon: <Edit />,
          },
          // {
          //   id: 'import',
          //   label: t('configPage.import.name', 'Import Config'),
          //   icon: <Upload />,
          //   onClick: handleImportConfigs,
          // },
        ]}
      />
      <DrilldownMenu
        ButtonProps={{ edge: 'end', size: 'small' }}
        dense
        items={[
          {
            id: 'export',
            label: t('configPage.backupAll', 'Backup All'),
            onClick: () => exportAll.mutate(),
            loading: exportAll.isPending,
            icon: <Download />,
          },
          // {
          //   id: 'showIntegration',
          //   label: t('configPage.showIntegration', 'View Integration Policy'),
          //   onClick: onShowIntegration,
          //   icon: <Visibility />,
          // },
        ]}
      />
    </TabToolbar>
  )
}
