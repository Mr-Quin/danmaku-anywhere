import { Upload } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'

type ConfigActionsProps = {
  onAdd: () => void
}

export const ConfigActions = ({ onAdd }: ConfigActionsProps) => {
  const { t } = useTranslation()

  const handleImportConfigs = useImportShareCodeDialog()

  return (
    <>
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
    </>
  )
}
