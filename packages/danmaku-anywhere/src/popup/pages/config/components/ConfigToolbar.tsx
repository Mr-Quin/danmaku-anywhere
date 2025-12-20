import { AddCircle, Edit, Upload } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'

type ConfigToolbarProps = {
  onAdd: () => void
  onShowIntegration: () => void
}

export const ConfigToolbar = ({
  onAdd,
  onShowIntegration,
}: ConfigToolbarProps) => {
  const { t } = useTranslation()

  const handleImportConfigs = useImportShareCodeDialog()

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
          {
            id: 'import',
            label: t('configPage.importShareCode', 'Import Share Code'),
            icon: <Upload />,
            onClick: handleImportConfigs,
          },
        ]}
      />
    </TabToolbar>
  )
}
