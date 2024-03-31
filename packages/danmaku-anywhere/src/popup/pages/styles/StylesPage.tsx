import { Box, FormControlLabel, Switch } from '@mui/material'
import { produce } from 'immer'

import { DanmakuOptionsController } from './StylesForm'

import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { PageToolbar } from '@/popup/component/PageToolbar'

export const StylesPage = () => {
  const { data: config, partialUpdate } = useDanmakuOptions()

  return (
    <Box overflow="auto">
      <PageToolbar title="Danmaku Style">
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
      </PageToolbar>
      <Box px={2} pb={2}>
        <DanmakuOptionsController />
      </Box>
    </Box>
  )
}
