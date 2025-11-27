import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { SeasonContextMenuPure } from './SeasonContextMenuPure'

interface SeasonContextMenuContainerProps {
  season: Season | CustomSeason
}

export const SeasonContextMenuContainer = ({
  season,
}: SeasonContextMenuContainerProps): ReactElement => {
  const exportDanmaku = useExportDanmaku()
  const { setDeletingDanmaku } = useDanmakuTreeContext()

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
    setDeletingDanmaku({ kind: 'season', season })
  }

  return (
    <SeasonContextMenuPure
      season={season}
      onExport={handleExport}
      onDelete={handleDelete}
    />
  )
}
