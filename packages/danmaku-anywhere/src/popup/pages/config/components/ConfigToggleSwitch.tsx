import { Switch } from '@mui/material'

import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'

interface ConfigToggleSwitchProps {
  config: MountConfig
}

export const ConfigToggleSwitch = ({ config }: ConfigToggleSwitchProps) => {
  const { updateConfig, update, isPending } = useMountConfig()

  return (
    <Switch
      checked={config.enabled}
      onChange={(e) =>
        updateConfig(config.name, { ...config, enabled: e.target.checked })
      }
      disabled={isPending || update.isPending}
    />
  )
}
