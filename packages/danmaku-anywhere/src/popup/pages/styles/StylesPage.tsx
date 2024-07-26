import {
  Box,
  FormControlLabel,
  ListItemText,
  MenuItem,
  Switch,
} from '@mui/material'
import { produce } from 'immer'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { DanmakuStylesForm } from './StylesForm'

import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { DrilldownMenu } from '@/popup/component/DrilldownMenu'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const StylesPage = () => {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()
  const navigate = useNavigate()

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name')}>
        <FormControlLabel
          control={
            <Switch
              checked={config.show}
              onChange={(e) =>
                partialUpdate(
                  produce(config, (draft) => {
                    draft.show = e.target.checked
                  })
                )
              }
            />
          }
          label={t('stylePage.show')}
        />
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
      <Box px={3} pb={2} maxWidth="100%">
        <DanmakuStylesForm />
      </Box>
    </TabLayout>
  )
}
