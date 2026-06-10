import { Delete, Refresh } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { type CheckedAgo, checkedAgo, matchesQuery } from '../catalog'
import { useManifestList, useRefreshCatalog } from '../hooks/useManifestList'
import { ManifestKindChip } from './ManifestKindChip'
import { ProviderRow, sourceCardSx } from './ProviderRow'
import { SectionHeader } from './SectionHeader'

interface CatalogSectionProps {
  filter: string
  installedManifestIds: Set<string>
  onImport: (manifest: ProviderManifestInfo) => void
  onDeleteManifest: (manifestId: string) => void
  isImporting: boolean
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
  onDeleteManifest,
  isImporting,
}: CatalogSectionProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { data, isLoading, isError, refetch } = useManifestList()
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
    if (isError) {
      return (
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1 }}
        >
          <Typography variant="body2" color="error">
            {t('providers.catalog.error', 'Failed to load catalog')}
          </Typography>
          <Button size="small" onClick={() => refetch()}>
            {t('common.retry', 'Retry')}
          </Button>
        </Stack>
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
      <Stack sx={{ gap: 1 }}>
        {visible.map((manifest) => (
          <Box key={manifest.id} sx={sourceCardSx}>
            <ProviderRow
              avatarSeed={manifest.id}
              primary={manifest.name}
              titleChip={<ManifestKindChip kind={manifest.kind} />}
              secondary={t('providers.catalog.version', 'v{{version}}', {
                version: manifest.version,
              })}
              action={
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onImport(manifest)}
                    disabled={isImporting}
                  >
                    {t('providers.catalog.import', 'Import')}
                  </Button>
                  {manifest.kind === 'user' ? (
                    <Tooltip title={t('common.delete', 'Delete')}>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={t('common.delete', 'Delete')}
                        onClick={() => onDeleteManifest(manifest.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              }
            />
          </Box>
        ))}
      </Stack>
    )
  }

  return (
    <Box sx={{ pb: 1.5 }}>
      <SectionHeader
        title={t('providers.catalog.title', 'Catalog')}
        count={visible.length}
      >
        <Typography variant="overline">{checkedLabel}</Typography>
        <Tooltip title={t('common.refresh', 'Refresh')}>
          <span>
            <IconButton
              size="small"
              edge="end"
              aria-label={t('common.refresh', 'Refresh')}
              onClick={() =>
                refresh.mutate(undefined, {
                  onError: (error) => {
                    toast.error(error.message)
                  },
                })
              }
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
