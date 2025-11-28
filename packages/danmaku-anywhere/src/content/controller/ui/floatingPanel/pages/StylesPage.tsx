import { Divider, ListItemText, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { FilterPage } from '@/content/common/DanmakuStyles/FilterPage'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'

export const StylesPage = () => {
  const { t } = useTranslation()
  const [showFilterPage, setShowFilterPage] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  if (showFilterPage) {
    return <FilterPage onGoBack={() => setShowFilterPage(false)} />
  }

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
            popover="manual"
            onClick={() => {
              setShowFilterPage(true)
            }}
          >
            <ListItemText>{t('stylePage.filtering.name')}</ListItemText>
          </MenuItem>
        </DrilldownMenu>
      </TabToolbar>
      <Divider />
      <ScrollBox px={3} pb={2} flexGrow={1} sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
      </ScrollBox>
    </TabLayout>
  )
}
