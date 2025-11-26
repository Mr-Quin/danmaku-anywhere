import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog'
import { EpisodeContextMenu } from '../menus/EpisodeContextMenu'

interface EpisodeTreeItemProps {
  episode: GenericEpisodeLite
  onSelect: (episode: GenericEpisodeLite) => void
}

export const EpisodeTreeItem = ({
  episode,
  onSelect,
}: EpisodeTreeItemProps) => {
  const { mutateAsync: load, isPending } = useFetchDanmaku()
  const exportDanmaku = useExportDanmaku()
  const deleteMutation = useDeleteEpisode()

  const { setViewingDanmaku } = useDanmakuTreeContext()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleFetchDanmaku = async () => {
    if (!isNotCustom(episode)) return

    await load({
      type: 'by-meta',
      meta: episode,
      options: {
        forceUpdate: true,
      },
    })
  }

  const handleMount = () => {
    onSelect(episode)
  }

  const handleExport = () => {
    if (isNotCustom(episode)) {
      exportDanmaku.mutate({
        filter: { ids: [episode.id] },
      })
    } else {
      exportDanmaku.mutate({
        customFilter: { ids: [episode.id] },
      })
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (isNotCustom(episode)) {
      deleteMutation.mutate(
        {
          isCustom: false,
          filter: { ids: [episode.id] },
        },
        {
          onSuccess: () => setShowDeleteConfirm(false),
        }
      )
    } else {
      deleteMutation.mutate(
        {
          isCustom: true,
          filter: { ids: [episode.id] },
        },
        {
          onSuccess: () => setShowDeleteConfirm(false),
        }
      )
    }
  }

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        py={0.5}
        overflow="hidden"
        pr={1}
      >
        <Typography noWrap variant="body2" sx={{ flex: 1 }}>
          {episode.title}
        </Typography>
        <EpisodeContextMenu
          episode={episode}
          onMount={handleMount}
          onViewDanmaku={() => setViewingDanmaku(episode)}
          onRefresh={handleFetchDanmaku}
          onExport={handleExport}
          onDelete={handleDelete}
          isRefreshing={isPending}
        />
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
