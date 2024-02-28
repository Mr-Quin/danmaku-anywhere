import { Stack, Switch } from '@mui/material'

import { OptionsBar } from './OptionsBar'
import { OptionsPage } from './OptionsPage'

import { useThemeContext } from '@/common/style/Theme'

export const Options = () => {
  const { colorScheme, setColorScheme } = useThemeContext()

  return (
    <OptionsPage>
      <OptionsBar title="Options" />
      <Stack spacing={2} sx={{ px: 2, py: 1 }}>
        <Switch
          checked={colorScheme === 'system'}
          onChange={() => {
            setColorScheme(colorScheme === 'system' ? 'dark' : 'system')
          }}
        />
      </Stack>
    </OptionsPage>
  )
}
