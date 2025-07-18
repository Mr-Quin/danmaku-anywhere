import { Box, ListItemText, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'

export const StylesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name')}>
        <SaveStatusIndicator status={saveStatus} />
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
        <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
      </Box>
    </TabLayout>
  )
}
