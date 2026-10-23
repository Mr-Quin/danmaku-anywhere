import { arrayMove } from '@dnd-kit/sortable'
import { Box, Stack, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { useSourceNames } from '@/common/options/providerConfig/useSourceNames'

interface SearchSettingsProps {
  dragOverlayPortal?: HTMLElement | null
}

export const SearchSettings = ({ dragOverlayPortal }: SearchSettingsProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const { setOrder, setEnabled } = useEditProviderConfig()
  const { nameOf } = useSourceNames()
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
            pb: 1,
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
              setOrder.mutate(
                arrayMove(configs, oldIndex, newIndex).map((c) => c.id)
              )
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
                  {nameOf(config)}
                </Typography>
              </Stack>
            )}
            renderSecondaryAction={(config) => (
              <Switch
                edge="end"
                checked={config.enabled}
                onChange={() =>
                  setEnabled.mutate({ id: config.id, enabled: !config.enabled })
                }
              />
            )}
          />
        </Box>
      </Box>
    </Stack>
  )
}
