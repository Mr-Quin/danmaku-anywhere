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

  const getActionLabel = () => {
    switch (colorMode) {
      case ColorMode.Light:
        return t('optionsPage.theme.switchToSystem', 'Switch to system theme')
      case ColorMode.System:
        return t('optionsPage.theme.switchToDark', 'Switch to dark theme')
      case ColorMode.Dark:
        return t('optionsPage.theme.switchToLight', 'Switch to light theme')
    }
  }

  return (
    <Tooltip title={getActionLabel()}>
      <IconButton
        onClick={handleToggle}
        aria-label={getActionLabel()}
        sx={{
          color: 'inherit',
        }}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  )
}
