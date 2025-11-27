import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog'
import { SeasonContextMenu } from '../menus/SeasonContextMenu'

interface SeasonTreeItemProps {
  season: Season | CustomSeason
  count?: number
}

export const SeasonTreeItem = ({ season, count }: SeasonTreeItemProps) => {
  const { getProviderById } = useProviderConfig()

  const exportDanmaku = useExportDanmaku()
  const deleteMutation = useDeleteEpisode()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const provider = isNotCustom(season)
    ? getProviderById(season.providerConfigId)
    : undefined

  const handleExport = () => {
    if (isNotCustom(season)) {
      exportDanmaku.mutate({
        filter: { id: season.id },
      })
    } else {
      exportDanmaku.mutate({
        customFilter: { id: season.id },
      })
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (isNotCustom(season)) {
      deleteMutation.mutate(
        {
          isCustom: false,
          filter: { seasonId: season.id },
        },
        {
          onSuccess: () => setShowDeleteConfirm(false),
        }
      )
    } else {
      if (season.id === -1) {
        // Delete all custom episodes
        deleteMutation.mutate(
          {
            isCustom: true,
            filter: {},
          },
          {
            onSuccess: () => setShowDeleteConfirm(false),
          }
        )
      }
    }
  }

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        overflow="hidden"
        pr={1}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          overflow="hidden"
        >
          {season.imageUrl && (
            <Box
              component="img"
              src={season.imageUrl}
              alt={season.title}
              sx={{
                width: 32,
                height: 48,
                objectFit: 'cover',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
          )}
          <Typography noWrap variant="body2">
            {season.title} {count !== undefined && `(${count})`}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
          {provider && (
            <Typography variant="caption" color="text.secondary">
              {provider.name}
            </Typography>
          )}
          <SeasonContextMenu
            season={season}
            onExport={handleExport}
            onDelete={handleDelete}
          />
        </Stack>
      </Stack>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
