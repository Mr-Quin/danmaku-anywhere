import { Box, FormControlLabel, Switch } from '@mui/material'
import { produce } from 'immer'

import { DanmakuOptionsController } from './StylesForm'

import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const StylesPage = () => {
  const { data: config, partialUpdate } = useDanmakuOptions()

  return (
    <TabLayout>
      <TabToolbar title="Danmaku Style">
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
          label="Show Danmaku"
        />
      </TabToolbar>
      <Box px={2} pb={2}>
        <DanmakuOptionsController />
      </Box>
    </TabLayout>
  )
}
