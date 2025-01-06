import { Switch } from '@mui/material'

import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'

interface ConfigToggleSwitchProps {
  config: MountConfig
}

export const ConfigToggleSwitch = ({ config }: ConfigToggleSwitchProps) => {
  const { update } = useEditMountConfig()

  return (
    <Switch
      checked={config.enabled}
      onChange={(e) =>
        update.mutate({
          id: config.id,
          config: { ...config, enabled: e.target.checked },
        })
      }
      disabled={update.isPending}
    />
  )
}
