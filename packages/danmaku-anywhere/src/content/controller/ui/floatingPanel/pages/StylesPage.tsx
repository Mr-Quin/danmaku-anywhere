import {
  Box,
  Button,
  Divider,
  ListItemText,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material'

import {
  DanmakuStylesForm,
  DanmakuStylesFormApi,
} from '@/common/components/DanmakuStyles/DanmakuStylesForm'
import { DrilldownMenu } from '@/popup/component/DrilldownMenu'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

export const StylesPage = () => {
  const { t } = useTranslation()
  const api = useRef<DanmakuStylesFormApi>(null)

  return (
    <Box
      flexGrow={1}
      position="relative"
      overflow="auto"
      display="flex"
      flexDirection="column"
    >
      <Toolbar>
        <Typography variant="h2" fontSize={18} sx={{ flexGrow: 1 }} noWrap>
          {t('stylePage.name')}
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => api.current?.save()}
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
              // navigate('filtering')
            }}
          >
            <ListItemText>{t('stylePage.filtering.name')}</ListItemText>
          </MenuItem>
        </DrilldownMenu>
      </Toolbar>
      <Divider />
      <Box px={3} pb={2} flexGrow={1} sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm apiRef={api} />
      </Box>
    </Box>
  )
}
