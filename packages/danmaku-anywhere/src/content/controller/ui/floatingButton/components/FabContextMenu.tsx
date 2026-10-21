import type { PopperProps } from '@mui/material'
import { MenuList, Paper, Popper } from '@mui/material'

import { useDanmakuActions } from '@/content/controller/common/hooks/useDanmakuActions'
import { ContextMenuItem } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'

type FabContextMenuProps = PopperProps

function FabMenuItems() {
  const menuItems = useDanmakuActions()
  return menuItems.map((item, i) => <ContextMenuItem key={i} {...item} />)
}

export const FabContextMenu = (props: FabContextMenuProps) => {
  return (
    <Popper placement="top-end" {...props}>
      <Paper>
        <MenuList dense>{props.open ? <FabMenuItems /> : null}</MenuList>
      </Paper>
    </Popper>
  )
}
