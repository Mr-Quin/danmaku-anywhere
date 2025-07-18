import { Box, List, ListItem, ListItemText, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { allHotkeys } from '@/common/options/extensionOptions/hotkeys'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { HotkeyInput } from '@/popup/pages/options/pages/hotkeyOptions/components/HotkeyInput'

export const HotkeySection = () => {
  const { t } = useTranslation()

  const { updateHotkey, getKeyCombo } = useHotkeyOptions()

  return (
    <Box px={2}>
      <List>
        {allHotkeys.map((label) => {
          return (
            <ListItem disablePadding key={label}>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <>{t(`optionsPage.hotkeys.keymap.${label}`)}</>
                    <HotkeyInput
                      value={getKeyCombo(label)}
                      onKeyChange={(key) => updateHotkey(label, key)}
                    />
                  </Stack>
                }
              />
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
}
