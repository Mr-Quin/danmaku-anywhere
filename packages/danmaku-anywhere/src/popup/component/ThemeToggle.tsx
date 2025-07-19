import {
  DarkModeOutlined,
  LightModeOutlined,
  SettingsBrightnessOutlined,
} from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ColorMode } from '@/common/theme/enums'
import { useThemeContext } from '@/common/theme/Theme'

export const ThemeToggle = () => {
  const { t } = useTranslation()
  const { colorMode, setColorMode } = useThemeContext()

  const handleToggle = () => {
    // Cycle through Light -> System -> Dark -> Light
    switch (colorMode) {
      case ColorMode.Light:
        setColorMode(ColorMode.System)
        break
      case ColorMode.System:
        setColorMode(ColorMode.Dark)
        break
      case ColorMode.Dark:
        setColorMode(ColorMode.Light)
        break
    }
  }

  const getIcon = () => {
    switch (colorMode) {
      case ColorMode.Light:
        return <LightModeOutlined />
      case ColorMode.System:
        return <SettingsBrightnessOutlined />
      case ColorMode.Dark:
        return <DarkModeOutlined />
    }
  }

  const getTooltip = () => {
    switch (colorMode) {
      case ColorMode.Light:
        return t('optionsPage.theme.colorMode.light')
      case ColorMode.System:
        return t('optionsPage.theme.colorMode.system')
      case ColorMode.Dark:
        return t('optionsPage.theme.colorMode.dark')
    }
  }

  return (
    <Tooltip title={getTooltip()}>
      <IconButton
        onClick={handleToggle}
        sx={{
          color: 'inherit',
        }}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  )
}
