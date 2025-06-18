import {
  DarkModeOutlined,
  LightModeOutlined,
  SettingsBrightnessOutlined,
} from '@mui/icons-material'
import { Box, ButtonGroup, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ColorMode } from '@/common/theme/enums'
import { useThemeContext } from '@/common/theme/Theme'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ThemeButton } from '@/popup/pages/options/pages/theme/ThemeButton'

export const ThemeOptions = () => {
  const { t } = useTranslation()
  const { colorMode, setColorMode } = useThemeContext()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.theme')} />
      <Box p={2}>
        <Typography variant="body1" color="textPrimary" gutterBottom>
          {t('optionsPage.theme.colorMode.name')}
        </Typography>
        <ButtonGroup variant="contained" fullWidth>
          <ThemeButton
            icon={<LightModeOutlined />}
            label={t('optionsPage.theme.colorMode.light')}
            selected={colorMode === ColorMode.Light}
            onClick={() => {
              setColorMode(ColorMode.Light)
            }}
          />
          <ThemeButton
            icon={<SettingsBrightnessOutlined />}
            label={t('optionsPage.theme.colorMode.system')}
            selected={colorMode === ColorMode.System}
            onClick={() => {
              setColorMode(ColorMode.System)
            }}
          />
          <ThemeButton
            icon={<DarkModeOutlined />}
            label={t('optionsPage.theme.colorMode.dark')}
            selected={colorMode === ColorMode.Dark}
            onClick={() => {
              setColorMode(ColorMode.Dark)
            }}
          />
        </ButtonGroup>
      </Box>
    </OptionsPageLayout>
  )
}
