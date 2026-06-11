import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { installedUpdates } from '../catalog'
import { useApplyUpdates, usePendingUpdates } from '../hooks/usePendingUpdates'
import { ProviderRow, sourceCardSx } from './ProviderRow'
import { SectionHeader } from './SectionHeader'

interface UpdatesSectionProps {
  installedManifestIds: Set<string>
  manifestById: Map<string, ProviderManifestInfo>
}

export const UpdatesSection = ({
  installedManifestIds,
  manifestById,
}: UpdatesSectionProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { data } = usePendingUpdates()
  const apply = useApplyUpdates()
  // Keyed per row: the mutation object only remembers its last call, so a
  // retry of one row must not clear another row's failure marker.
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set())

  const updates = installedUpdates(data ?? [], installedManifestIds)

  if (updates.length === 0) {
    return null
  }

  const runApply = (manifestIds: string[]) => {
    apply.mutate(manifestIds, {
      onSuccess: () => {
        setFailedIds((prev) => {
          const next = new Set(prev)
          for (const id of manifestIds) {
            next.delete(id)
          }
          return next
        })
      },
      onError: (error) => {
        setFailedIds((prev) => new Set([...prev, ...manifestIds]))
        toast.error(error.message)
      },
    })
  }

  const attempted = (manifestId: string) => {
    return apply.variables?.includes(manifestId) ?? false
  }

  const buttonLabel = (updating: boolean, failed: boolean) => {
    if (updating) {
      return t('providers.updates.updating', 'Updating…')
    }
    if (failed) {
      return t('common.retry', 'Retry')
    }
    return t('providers.updates.update', 'Update')
  }

  return (
    <Box sx={{ pb: 1.5 }}>
      <SectionHeader
        title={t('providers.updates.title', 'Updates available')}
        count={updates.length}
      >
        {updates.length > 1 ? (
          <Button
            size="small"
            onClick={() => runApply(updates.map((update) => update.manifestId))}
            disabled={apply.isPending}
          >
            {t('providers.updates.updateAll', 'Update all')}
          </Button>
        ) : null}
      </SectionHeader>
      <Stack sx={{ gap: 1 }}>
        {updates.map((update) => {
          const updatingThis = apply.isPending && attempted(update.manifestId)
          const failedThis = !updatingThis && failedIds.has(update.manifestId)
          const versionLabel = t(
            'providers.updates.version',
            'v{{from}} → v{{to}}',
            { from: update.fromVersion, to: update.toVersion }
          )
          return (
            <Box key={update.manifestId} sx={sourceCardSx}>
              <ProviderRow
                avatarSeed={update.manifestId}
                primary={
                  manifestById.get(update.manifestId)?.name ?? update.manifestId
                }
                secondary={
                  failedThis ? (
                    <Typography
                      component="span"
                      variant="inherit"
                      color="error"
                    >
                      {t('providers.updates.failed', 'Update failed')}
                    </Typography>
                  ) : (
                    versionLabel
                  )
                }
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => runApply([update.manifestId])}
                    disabled={apply.isPending}
                    loading={updatingThis}
                    loadingPosition="start"
                  >
                    {buttonLabel(updatingThis, failedThis)}
                  </Button>
                }
              />
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
