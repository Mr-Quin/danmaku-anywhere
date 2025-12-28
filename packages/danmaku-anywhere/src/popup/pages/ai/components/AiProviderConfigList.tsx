import { Delete } from '@mui/icons-material'
import { Chip, Switch } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { BUILT_IN_AI_PROVIDER_ID } from '@/common/options/aiProviderConfig/constant'
import type { AiProviderConfig } from '@/common/options/aiProviderConfig/schema'
import {
  useAiProviderConfig,
  useEditAiProviderConfig,
} from '@/common/options/aiProviderConfig/useAiProviderConfig'

export const AiProviderConfigList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: AiProviderConfig) => void
  onDelete: (config: AiProviderConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useAiProviderConfig()
  const { toggle, reorder } = useEditAiProviderConfig()

  function handleToggle(config: AiProviderConfig) {
    toggle.mutate({ id: config.id })
  }

  const renderItem = (config: AiProviderConfig) => {
    return (
      <ListItemPrimaryStack text={config.name}>
        <Chip label={config.provider} size="small" variant="outlined" />
      </ListItemPrimaryStack>
    )
  }

  return (
    <DraggableList<AiProviderConfig>
      items={configs}
      onEdit={onEdit}
      onReorder={(sourceIndex, destinationIndex) => {
        reorder.mutate({ sourceIndex, destinationIndex })
      }}
      renderPrimary={renderItem}
      renderSecondary={(config) =>
        config.provider === 'BuiltIn'
          ? ''
          : config.settings.baseUrl || 'OpenAI Default'
      }
      renderSecondaryAction={(config) => (
        <>
          <Switch
            onChange={(e) => handleToggle(config)}
            checked={config.enabled}
            disabled={toggle.isPending}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
          {config.id !== BUILT_IN_AI_PROVIDER_ID && (
            <DrilldownMenu
              BoxProps={{ display: 'inline' }}
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
