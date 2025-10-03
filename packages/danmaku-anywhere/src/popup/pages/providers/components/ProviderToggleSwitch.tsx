import { Switch } from '@mui/material'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'

export const ProviderToggleSwitch = ({
  config,
}: {
  config: ProviderConfig
}) => {
  const { toggle } = useEditProviderConfig()

  const handleToggle = () => {
    toggle.mutate({ id: config.id })
  }

  return (
    <Switch
      onChange={handleToggle}
      checked={config.enabled}
      disabled={toggle.isPending}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
