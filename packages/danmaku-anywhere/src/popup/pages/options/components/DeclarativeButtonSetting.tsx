import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import type { ButtonSettingConfig } from '@/common/settings/settingConfigs'

interface DeclarativeButtonSettingProps {
  config: ButtonSettingConfig
  isLoading?: boolean
}

export const DeclarativeButtonSetting = ({
  config,
  isLoading,
}: DeclarativeButtonSettingProps) => {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={config.onClick} disabled={isLoading}>
        <ListItemText primary={config.label()} />
        {isLoading && <CircularProgress size={24} />}
      </ListItemButton>
    </ListItem>
  )
}
