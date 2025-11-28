import { ListItemText, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'

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
      <ScrollBox px={3} pb={2} maxWidth="100%" sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
      </ScrollBox>
    </TabLayout>
  )
}
