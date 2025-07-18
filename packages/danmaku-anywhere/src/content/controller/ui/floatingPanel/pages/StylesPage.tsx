import { Box, Divider, ListItemText, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { FilterPage } from '@/content/common/DanmakuStyles/FilterPage'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'

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
          MenuProps={{
            sx: {
              zIndex: 1403,
            },
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
      <Box px={3} pb={2} flexGrow={1} sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
      </Box>
    </TabLayout>
  )
}
