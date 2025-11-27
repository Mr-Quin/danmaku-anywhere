import type { ReactElement } from 'react'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/ExtendedTreeItem'
import { EpisodeContextMenuContainer } from './EpisodeContextMenuContainer'
import { SeasonContextMenuContainer } from './SeasonContextMenuContainer'

interface DanmakuContextMenuProps {
  item: ExtendedTreeItem
}

export const DanmakuContextMenu = ({
  item,
}: DanmakuContextMenuProps): ReactElement | null => {
  if (item.kind === 'season') {
    return <SeasonContextMenuContainer season={item.data} />
  }

  if (item.kind === 'episode') {
    return <EpisodeContextMenuContainer episode={item.data} />
  }

  return null
}
