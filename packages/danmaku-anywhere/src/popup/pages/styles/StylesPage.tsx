import { Box, ListItemText, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { DanmakuStylesForm } from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import {} from 'react'

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
