import { Add, Upload } from '@mui/icons-material'
import { Button, IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'

type ConfigToolbarProps = {
  onAdd: () => void
  onShowIntegration: () => void
}

export const ConfigToolbar = ({ onAdd }: ConfigToolbarProps) => {
  const { t } = useTranslation()

  const handleImportConfigs = useImportShareCodeDialog()

  return (
    <TabToolbar title={t('configPage.name', 'Configs')}>
      <Tooltip title={t('configPage.importShareCode', 'Import Share Code')}>
        <IconButton size="small" onClick={handleImportConfigs}>
          <Upload fontSize="small" />
        </IconButton>
      </Tooltip>
      <Button
        variant="soft"
        color="primary"
        size="small"
        startIcon={<Add />}
        onClick={onAdd}
      >
        {t('common.add', 'Add')}
      </Button>
    </TabToolbar>
  )
}
