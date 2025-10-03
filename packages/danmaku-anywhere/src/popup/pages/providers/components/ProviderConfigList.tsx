import { Delete } from '@mui/icons-material'
import { Chip, ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { ProviderToggleSwitch } from './ProviderToggleSwitch'

export const ProviderConfigList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const { reorder } = useEditProviderConfig()

  const getSecondaryText = (config: ProviderConfig) => {
    if (config.isBuiltIn) {
      return t('providers.builtin')
    }
    if (config.type === 'DanDanPlayCompatible') {
      return config.options.baseUrl
    }
    if (config.type === 'MacCMS') {
      return config.options.danmakuBaseUrl
    }
    return ''
  }

  const renderChip = (config: ProviderConfig) => {
    if (config.isBuiltIn) {
      return (
        <Chip
          label={t('providers.builtin')}
          size="small"
          sx={{ ml: 1 }}
          color="primary"
        />
      )
    }
    return (
      <Chip label={config.type} size="small" sx={{ ml: 1 }} color="secondary" />
    )
  }

  return (
    <DraggableList
      items={configs}
      onEdit={onEdit}
      onReorder={(sourceIndex, destinationIndex) => {
        reorder.mutate({ sourceIndex, destinationIndex })
      }}
      renderPrimary={(config) => (
        <span>
          {config.name}
          {renderChip(config)}
        </span>
      )}
      renderSecondary={getSecondaryText}
      renderSecondaryAction={(config) => (
        <>
          <ProviderToggleSwitch config={config} />
          {!config.isBuiltIn && (
            <DrilldownMenu
              BoxProps={{ display: 'inline' }}
              ButtonProps={{ edge: 'end' }}
            >
              <MenuItem onClick={() => onDelete(config)}>
                <ListItemIcon>
                  <Delete />
                </ListItemIcon>
                <ListItemText>{t('common.delete')}</ListItemText>
              </MenuItem>
            </DrilldownMenu>
          )}
        </>
      )}
    />
  )
}
