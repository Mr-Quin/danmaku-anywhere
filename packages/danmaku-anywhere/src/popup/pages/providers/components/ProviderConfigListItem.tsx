import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderWarning } from '../hooks/useProviderWarning'
import { ProviderWarningIcon } from './ProviderWarningIcon'

interface ProviderConfigListItemProps {
  config: ProviderConfig
}

export const ProviderConfigListItem = ({
  config,
}: ProviderConfigListItemProps) => {
  const { t } = useTranslation()
  const { showWarning, warningType } = useProviderWarning(config)

  const renderChip = () => {
    if (config.isBuiltIn) {
      return (
        <Chip
          label={t('providers.builtin', 'Built-in')}
          size="small"
          sx={{ mr: 1 }}
          color="primary"
        />
      )
    }
    return (
      <Chip
        label={t(localizedDanmakuSourceType(config.impl))}
        size="small"
        sx={{ mr: 1 }}
      />
    )
  }

  return (
    <ListItemPrimaryStack
      text={
        config.isBuiltIn ? localizedDanmakuSourceType(config.impl) : config.name
      }
    >
      {showWarning && <ProviderWarningIcon warningType={warningType} />}
      {renderChip()}
    </ListItemPrimaryStack>
  )
}
