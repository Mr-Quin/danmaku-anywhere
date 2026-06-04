import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { Delete } from '@mui/icons-material'
import { Switch } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { ProviderConfigListItem } from './ProviderConfigListItem'

export const ProviderConfigList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const { reorder, toggle } = useEditProviderConfig()

  function handleToggle(config: ProviderConfig) {
    toggle.mutate({ id: config.id })
  }

  const getSecondaryText = (config: ProviderConfig) => {
    const isCustomDdp =
      config.manifestId ===
        PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay] &&
      !config.isBuiltIn
    if (isCustomDdp) {
      return (config.configValues.baseUrl as string) ?? ''
    }
    if (config.manifestId === LEGACY_MACCMS_ID) {
      return (config.configValues.danmakuBaseUrl as string) ?? ''
    }
    return ''
  }

  return (
    <DraggableList
      items={configs}
      onEdit={onEdit}
      onReorder={(sourceIndex, destinationIndex) => {
        reorder.mutate({ sourceIndex, destinationIndex })
      }}
      renderPrimary={(config) => <ProviderConfigListItem config={config} />}
      renderSecondary={getSecondaryText}
      renderSecondaryAction={(config) => (
        <>
          <Switch
            onChange={(e) => handleToggle(config)}
            checked={config.enabled}
            disabled={toggle.isPending}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
          {!config.isBuiltIn && (
            <DrilldownMenu
              BoxProps={{ sx: { display: 'inline' } }}
              ButtonProps={{ edge: 'end', size: 'small' }}
              dense
              items={[
                {
                  id: 'delete',
                  label: t('common.delete', 'Delete'),
                  onClick: () => onDelete(config),
                  icon: <Delete />,
                  color: 'error',
                },
              ]}
            />
          )}
        </>
      )}
    />
  )
}
