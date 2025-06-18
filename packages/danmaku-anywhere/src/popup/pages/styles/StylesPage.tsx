import { Box, Button, ListItemText, MenuItem } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  DanmakuStylesForm,
  type DanmakuStylesFormApi,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'

export const StylesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const api = useRef<DanmakuStylesFormApi>(null)
  const [canSave, setCanSave] = useState(false)

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
