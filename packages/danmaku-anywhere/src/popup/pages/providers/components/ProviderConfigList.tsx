import { Delete } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { ProviderConfigListItem } from './ProviderConfigListItem'
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
    if (config.type === 'DanDanPlayCompatible') {
      return config.options.baseUrl
    }
    if (config.type === 'MacCMS') {
      return config.options.danmakuBaseUrl
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
          <ProviderToggleSwitch config={config} />
          {!config.isBuiltIn && (
            <DrilldownMenu
              BoxProps={{ display: 'inline' }}
              ButtonProps={{ edge: 'end' }}
              items={[
                {
                  id: 'delete',
                  label: t('common.delete'),
                  onClick: () => onDelete(config),
                  icon: <Delete />,
                },
              ]}
            />
          )}
        </>
      )}
    />
  )
}
