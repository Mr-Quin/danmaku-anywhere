import { Box, ListItemText, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { DanmakuStylesForm } from '@/common/components/DanmakuStylesForm'
import { DrilldownMenu } from '@/popup/component/DrilldownMenu'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const StylesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name')}>
        <DrilldownMenu
          ButtonProps={{
            edge: 'end',
          }}
        >
          <MenuItem
            onClick={() => {
              navigate('filtering')
            }}
          >
            <ListItemText>{t('stylePage.filtering.name')}</ListItemText>
          </MenuItem>
        </DrilldownMenu>
      </TabToolbar>
      <Box px={3} pb={2} maxWidth="100%" sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm />
      </Box>
    </TabLayout>
  )
}
