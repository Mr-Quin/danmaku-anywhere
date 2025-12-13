import {
  Box,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Switch,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ProviderConfigChip } from '@/common/options/providerConfig/ProviderConfigChip'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { ListItemPrimaryStack } from '../ListItemPrimaryStack'

export const SearchSettings = () => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()

  const { reorder, toggle } = useEditProviderConfig()

  const { data: extOptions, partialUpdate } = useExtensionOptions()

  return (
    <Box>
      <List>
        <ListItem
          secondaryAction={
            <Switch
              edge="end"
              checked={extOptions.searchUsingSimplified}
              onChange={(e) =>
                partialUpdate({
                  searchUsingSimplified: e.target.checked,
                })
              }
            />
          }
        >
          <ListItemText
            primary={t(
              'optionsPage.searchUsingSimplified',
              'Search using simplified Chinese'
            )}
          />
        </ListItem>
      </List>

      <Divider />

      <ListSubheader disableSticky>
        {t('providers.name', 'Danmaku Providers')}
      </ListSubheader>

      <DraggableList
        clickable={false}
        items={configs}
        onReorder={(oldIndex, newIndex) =>
          reorder.mutate({ sourceIndex: oldIndex, destinationIndex: newIndex })
        }
        renderPrimary={(config) => (
          <ListItemPrimaryStack
            text={
              config.isBuiltIn
                ? localizedDanmakuSourceType(config.impl)
                : config.name
            }
          >
            <ProviderConfigChip config={config} />
          </ListItemPrimaryStack>
        )}
        renderSecondaryAction={(config) => (
          <Checkbox
            edge="end"
            checked={config.enabled}
            onChange={() =>
              toggle.mutate({ id: config.id, enabled: !config.enabled })
            }
          />
        )}
      />
    </Box>
  )
}
