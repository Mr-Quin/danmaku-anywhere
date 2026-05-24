import { Box, Stack, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ProviderConfigChip } from '@/common/options/providerConfig/ProviderConfigChip'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'

interface SearchSettingsProps {
  dragOverlayPortal?: HTMLElement | null
}

export const SearchSettings = ({ dragOverlayPortal }: SearchSettingsProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const { reorder, toggle } = useEditProviderConfig()
  const { data: extOptions, partialUpdate } = useExtensionOptions()

  return (
    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          padding: '8px 10px',
          borderRadius: 1,
          backgroundColor: theme.palette.paperAlt,
        })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('optionsPage.searchUsingSimplified', 'Use Simplified Chinese')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            {t(
              'searchPage.settings.simplifiedHelper',
              'Convert search terms to Simplified Chinese before sending.'
            )}
          </Typography>
        </Box>
        <Switch
          edge="end"
          checked={extOptions.searchUsingSimplified}
          onChange={(e) =>
            partialUpdate({ searchUsingSimplified: e.target.checked })
          }
        />
      </Box>
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            px: 0.25,
            display: 'block',
          }}
        >
          {t('searchPage.settings.sources', 'Sources')}
        </Typography>
        <Box
          sx={{
            '& .MuiListItem-root': {
              padding: '4px 6px',
            },
            '& .MuiListItem-root .MuiListItemButton-root': {
              paddingRight: 6,
            },
          }}
        >
          <DraggableList
            overlayPortal={dragOverlayPortal}
            clickable={false}
            items={configs}
            onReorder={(oldIndex, newIndex) =>
              reorder.mutate({
                sourceIndex: oldIndex,
                destinationIndex: newIndex,
              })
            }
            renderPrimary={(config) => (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {config.isBuiltIn
                    ? localizedDanmakuSourceType(config.impl)
                    : config.name}
                </Typography>
                <ProviderConfigChip config={config} />
              </Stack>
            )}
            renderSecondaryAction={(config) => (
              <Switch
                edge="end"
                checked={config.enabled}
                onChange={() =>
                  toggle.mutate({ id: config.id, enabled: !config.enabled })
                }
              />
            )}
          />
        </Box>
      </Box>
    </Stack>
  )
}
