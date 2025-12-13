import { Box, styled } from '@mui/material'
import type { ReactElement } from 'react'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/tree/ExtendedTreeItem'
import { EpisodeContextMenuContainer } from './EpisodeContextMenuContainer'
import { SeasonContextMenuContainer } from './SeasonContextMenuContainer'

const StyledBox = styled(Box)({
  position: 'absolute',
  top: '4px',
  right: 0,
})

interface DanmakuContextMenuProps {
  item: ExtendedTreeItem
}

export const DanmakuContextMenu = ({
  item,
}: DanmakuContextMenuProps): ReactElement | null => {
  if (item.kind === 'folder') {
    return null
  }

  const element =
    item.kind === 'season' ? (
      <SeasonContextMenuContainer season={item.data} itemId={item.id} />
    ) : (
      <EpisodeContextMenuContainer episode={item.data} itemId={item.id} />
    )

  return <StyledBox>{element}</StyledBox>
}
