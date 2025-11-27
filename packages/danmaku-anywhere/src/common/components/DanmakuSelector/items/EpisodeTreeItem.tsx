import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { EpisodeContextMenu } from '../menus/EpisodeContextMenu'

interface EpisodeTreeItemProps {
  episode: GenericEpisodeLite
  onSelect: (episode: GenericEpisodeLite) => void
}

export const EpisodeTreeItem = ({
  episode,
  onSelect,
}: EpisodeTreeItemProps): ReactElement => {
  const { mutateAsync: load, isPending } = useFetchDanmaku()
  const exportDanmaku = useExportDanmaku()

  const { setViewingDanmaku, setDeletingDanmaku } = useDanmakuTreeContext()

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
    setDeletingDanmaku({ kind: 'episode', episode })
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
    </>
  )
}
