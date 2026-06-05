import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { ProviderConfigChip } from '@/common/options/providerConfig/ProviderConfigChip'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderWarning } from '../hooks/useProviderWarning'
import { ProviderWarningIcon } from './ProviderWarningIcon'

interface ProviderConfigListItemProps {
  config: ProviderConfig
}

function manifestTestId(manifestId: string): string {
  const [, suffix] = manifestId.split(':')
  return suffix ?? manifestId
}

export const ProviderConfigListItem = ({
  config,
}: ProviderConfigListItemProps) => {
  const { showWarning, cookieSet } = useProviderWarning(config)

  return (
    <ListItemPrimaryStack
      text={
        config.isBuiltIn ? localizedDanmakuSourceType(config.impl) : config.name
      }
    >
      {showWarning ? (
        <ProviderWarningIcon
          testId={manifestTestId(config.manifestId)}
          cookieSet={cookieSet}
        />
      ) : null}
      <ProviderConfigChip config={config} />
    </ListItemPrimaryStack>
  )
}
