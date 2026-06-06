import { Public, Refresh } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { type CheckedAgo, checkedAgo, matchesQuery } from '../catalog'
import { useManifestList, useRefreshCatalog } from '../hooks/useManifestList'
import { SectionHeader } from './SectionHeader'

interface CatalogSectionProps {
  filter: string
  installedManifestIds: Set<string>
  onImport: (manifest: ProviderManifestInfo) => void
}

function useCheckedAgoLabel(lastCheckedAt: number | null): string {
  const { t } = useTranslation()
  const ago: CheckedAgo = checkedAgo(lastCheckedAt, Date.now())
  switch (ago.unit) {
    case 'never':
      return t('providers.catalog.checked.never', 'not checked yet')
    case 'justNow':
      return t('providers.catalog.checked.justNow', 'checked just now')
    case 'minutes':
      return t('providers.catalog.checked.minutes', 'checked {{count}}m ago', {
        count: ago.count,
      })
    case 'hours':
      return t('providers.catalog.checked.hours', 'checked {{count}}h ago', {
        count: ago.count,
      })
    case 'days':
      return t('providers.catalog.checked.days', 'checked {{count}}d ago', {
        count: ago.count,
      })
  }
}

export const CatalogSection = ({
  filter,
  installedManifestIds,
  onImport,
}: CatalogSectionProps) => {
  const { t } = useTranslation()
  const { data, isLoading } = useManifestList()
  const refresh = useRefreshCatalog()

  const checkedLabel = useCheckedAgoLabel(data?.lastCheckedAt ?? null)

  const uninstalled = (data?.manifests ?? []).filter(
    (manifest) => !installedManifestIds.has(manifest.id)
  )
  const visible = uninstalled.filter((manifest) =>
    matchesQuery(filter, manifest.name, manifest.id)
  )

  const renderBody = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )
    }
    if (visible.length === 0) {
      const message =
        uninstalled.length === 0
          ? t('providers.catalog.empty', 'All sources are installed')
          : t('providers.catalog.noMatch', 'No matching sources')
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {message}
        </Typography>
      )
    }
    return (
      <List
        dense
        disablePadding
        sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
      >
        {visible.map((manifest) => (
          <ListItem
            key={manifest.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
            secondaryAction={
              <Button
                size="small"
                variant="outlined"
                onClick={() => onImport(manifest)}
              >
                {t('providers.catalog.import', 'Import')}
              </Button>
            }
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Public />
            </ListItemIcon>
            <ListItemText
              primary={manifest.name}
              secondary={t('providers.catalog.version', 'v{{version}}', {
                version: manifest.version,
              })}
            />
          </ListItem>
        ))}
      </List>
    )
  }

  return (
    <Box sx={{ pb: 1.5 }}>
      <SectionHeader
        title={t('providers.catalog.title', 'Catalog')}
        count={visible.length}
      >
        <Typography variant="caption" color="text.secondary">
          {checkedLabel}
        </Typography>
        <Tooltip title={t('common.refresh', 'Refresh')}>
          <span>
            <IconButton
              size="small"
              edge="end"
              aria-label={t('common.refresh', 'Refresh')}
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              {refresh.isPending ? <CircularProgress size={16} /> : <Refresh />}
            </IconButton>
          </span>
        </Tooltip>
      </SectionHeader>
      {renderBody()}
    </Box>
  )
}
