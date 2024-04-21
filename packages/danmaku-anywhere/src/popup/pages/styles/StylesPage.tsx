import { Box, FormControlLabel, Switch } from '@mui/material'
import { produce } from 'immer'
import { useTranslation } from 'react-i18next'

import { DanmakuOptionsController } from './StylesForm'

import { useDanmakuOptionsSuspense } from '@/common/options/danmakuOptions/useDanmakuOptionsSuspense'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const StylesPage = () => {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptionsSuspense()

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
      </TabToolbar>
      <Box px={2} pb={2}>
        <DanmakuOptionsController />
      </Box>
    </TabLayout>
  )
}
