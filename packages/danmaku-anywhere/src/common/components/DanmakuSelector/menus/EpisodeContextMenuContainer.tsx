import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { EpisodeContextMenuPure } from './EpisodeContextMenuPure'

interface EpisodeContextMenuContainerProps {
  episode: GenericEpisodeLite
}

export const EpisodeContextMenuContainer = ({
  episode,
}: EpisodeContextMenuContainerProps): ReactElement => {
  const { mutateAsync: load, isPending } = useFetchDanmaku()
  const exportDanmaku = useExportDanmaku()

  const { onSelect, setViewingDanmaku, setDeletingDanmaku } =
    useDanmakuTreeContext()

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
    <EpisodeContextMenuPure
      episode={episode}
      canRefresh={isNotCustom(episode)}
      isRefreshing={isPending}
      onMount={handleMount}
      onViewDanmaku={() => setViewingDanmaku(episode)}
      onRefresh={handleFetchDanmaku}
      onExport={handleExport}
      onDelete={handleDelete}
    />
  )
}
