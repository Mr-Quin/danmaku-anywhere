import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useRefreshSeason } from '@/common/anime/queries/useRefreshSeason'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { SeasonContextMenuPure } from './SeasonContextMenuPure'

interface SeasonContextMenuContainerProps {
  season: Season | CustomSeason
}

export const SeasonContextMenuContainer = ({
  season,
}: SeasonContextMenuContainerProps): ReactElement => {
  const exportXml = useExportXml()

  const { setDeletingDanmaku } = useDanmakuTreeContext()
  const refreshSeason = useRefreshSeason()

  const handleExport = () => {
    if (isNotCustom(season)) {
      exportXml.mutate({
        filter: { seasonId: season.id },
      })
    } else {
      exportXml.mutate({
        customFilter: { all: true },
      })
    }
  }

  const handleDelete = () => {
    setDeletingDanmaku({ kind: 'season', season })
  }

  return (
    <SeasonContextMenuPure
      season={season}
      onExport={handleExport}
      isExporting={exportXml.isPending}
      onRefresh={() => refreshSeason.mutate(season.id)}
      isRefreshing={refreshSeason.isPending}
      onDelete={handleDelete}
    />
  )
}
