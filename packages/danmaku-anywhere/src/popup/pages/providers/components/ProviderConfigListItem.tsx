import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { ProviderConfigChip } from '@/common/options/providerConfig/ProviderConfigChip'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderWarning } from '../hooks/useProviderWarning'
import { ProviderWarningIcon } from './ProviderWarningIcon'

interface ProviderConfigListItemProps {
  config: ProviderConfig
}

export const ProviderConfigListItem = ({
  config,
}: ProviderConfigListItemProps) => {
  const { showWarning, warningType } = useProviderWarning(config)

  return (
    <ListItemPrimaryStack
      text={
        config.isBuiltIn ? localizedDanmakuSourceType(config.impl) : config.name
      }
    >
      {showWarning && <ProviderWarningIcon warningType={warningType} />}
      <ProviderConfigChip config={config} />
    </ListItemPrimaryStack>
  )
}
