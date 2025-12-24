import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useState } from 'react'
import type { ButtonSettingConfig } from '@/common/settings/settingConfigs'

interface DeclarativeButtonSettingProps {
  config: ButtonSettingConfig
  isLoading?: boolean
}

export const DeclarativeButtonSetting = ({
  config,
  isLoading: isLoadingProp,
}: DeclarativeButtonSettingProps) => {
  const [isLoadingState, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      await config.handler()
    } finally {
      setIsLoading(false)
    }
  }

  const isLoading = isLoadingState || isLoadingProp

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick} disabled={isLoading}>
        <ListItemText primary={config.label()} />
        {isLoading && <CircularProgress size={24} />}
      </ListItemButton>
    </ListItem>
  )
}
