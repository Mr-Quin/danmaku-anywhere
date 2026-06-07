import { Alert, Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import {
  ALL_HOTKEYS,
  HOTKEY_LABELS,
} from '@/common/options/extensionOptions/hotkeys'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { SettingsGroup } from '@/popup/pages/options/components/settings/SettingsGroup'
import { HotkeyInput } from '@/popup/pages/options/pages/hotkeyOptions/components/HotkeyInput'

export const HotkeyOptions = () => {
  const { t } = useTranslation()

  const { updateHotkey, getKeyCombo } = useHotkeyOptions()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.hotkeys', 'Hotkeys')} />
      <Box sx={{ px: 1.5, pt: 0.5, pb: 1.25 }}>
        <Alert severity="info">
          {t(
            'optionsPage.hotkeys.banner',
            'Click a shortcut, then press the new key combination.'
          )}
        </Alert>
      </Box>
      <SettingsGroup sx={{ mb: 1.75 }}>
        {ALL_HOTKEYS.map((label) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.75,
              py: 1.25,
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
              {HOTKEY_LABELS[label]()}
            </Typography>
            <HotkeyInput
              value={getKeyCombo(label)}
              onKeyChange={(key) => updateHotkey(label, key)}
            />
          </Box>
        ))}
      </SettingsGroup>
    </OptionsPageLayout>
  )
}
