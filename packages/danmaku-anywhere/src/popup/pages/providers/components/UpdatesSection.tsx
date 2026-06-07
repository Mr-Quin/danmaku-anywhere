import { Box, Button, CircularProgress, Stack } from '@mui/material'
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

  const updates = installedUpdates(data ?? [], installedManifestIds)

  if (updates.length === 0) {
    return null
  }

  const runApply = (manifestIds: string[]) => {
    apply.mutate(manifestIds, {
      onError: (error) => {
        toast.error(error.message)
      },
    })
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
          const updatingThis =
            apply.isPending && apply.variables?.includes(update.manifestId)
          return (
            <Box key={update.manifestId} sx={sourceCardSx}>
              <ProviderRow
                avatarSeed={update.manifestId}
                primary={
                  manifestById.get(update.manifestId)?.name ?? update.manifestId
                }
                secondary={t(
                  'providers.updates.version',
                  'v{{from}} → v{{to}}',
                  { from: update.fromVersion, to: update.toVersion }
                )}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => runApply([update.manifestId])}
                    disabled={apply.isPending}
                  >
                    {updatingThis ? (
                      <CircularProgress size={16} />
                    ) : (
                      t('providers.updates.update', 'Update')
                    )}
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
