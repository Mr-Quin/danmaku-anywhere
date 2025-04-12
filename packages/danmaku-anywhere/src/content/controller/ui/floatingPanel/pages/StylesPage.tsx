import { Box, Button, Divider, ListItemText, MenuItem } from '@mui/material'

import {
  DanmakuStylesForm,
  DanmakuStylesFormApi,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { FilterPage } from '@/content/common/DanmakuStyles/FilterPage'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const StylesPage = () => {
  const { t } = useTranslation()
  const api = useRef<DanmakuStylesFormApi>(null)

  const [showFilterPage, setShowFilterPage] = useState(false)
  const [canSave, setCanSave] = useState(false)

  if (showFilterPage) {
    return <FilterPage onGoBack={() => setShowFilterPage(false)} />
  }

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name')}>
        <Button
          variant="contained"
          size="small"
          onClick={() => api.current?.save()}
          disabled={!canSave}
        >
          {t('common.apply')}
        </Button>
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
        <DanmakuStylesForm
          apiRef={api}
          onDirtyChange={(isDirty) => {
            setCanSave(isDirty)
          }}
        />
      </Box>
    </TabLayout>
  )
}
