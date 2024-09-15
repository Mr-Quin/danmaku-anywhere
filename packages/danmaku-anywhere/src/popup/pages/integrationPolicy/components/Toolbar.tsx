import { AddCircle } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { TabToolbar } from '@/popup/component/TabToolbar'

export const Toolbar = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation()

  return (
    <TabToolbar title={t('integrationPolicyPage.name')}>
      <IconButton
        aria-label={t('common.add')}
        onClick={() => {
          onAdd()
        }}
        color="primary"
      >
        <Tooltip title={t('common.add')}>
          <AddCircle />
        </Tooltip>
      </IconButton>
    </TabToolbar>
  )
}
