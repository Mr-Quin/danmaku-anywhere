import { Upload } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'

type ConfigToolbarProps = {
  onAdd: () => void
}

export const ConfigToolbar = ({ onAdd }: ConfigToolbarProps) => {
  const { t } = useTranslation()

  const handleImportConfigs = useImportShareCodeDialog()

  return (
    <TabToolbar title={t('configPage.name', 'Configs')}>
      <Tooltip title={t('configPage.importShareCode', 'Import Share Code')}>
        <IconButton
          size="small"
          onClick={handleImportConfigs}
          aria-label={t('configPage.importShareCode', 'Import Share Code')}
        >
          <Upload fontSize="small" />
        </IconButton>
      </Tooltip>
      <ListAddButton onClick={onAdd}>{t('common.add', 'Add')}</ListAddButton>
    </TabToolbar>
  )
}
