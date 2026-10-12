import type { PopperProps } from '@mui/material'
import { MenuList, Paper, Popper } from '@mui/material'

import { useDanmakuActions } from '@/content/controller/common/hooks/useDanmakuActions'
import { ContextMenuItem } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'

type FabContextMenuProps = PopperProps

export const FabContextMenu = (props: FabContextMenuProps) => {
  const menuItems = useDanmakuActions()

  return (
    <Popper placement="top-end" {...props}>
      <Paper>
        <MenuList dense>
          {menuItems.map((item, i) => (
            <ContextMenuItem key={i} {...item} />
          ))}
        </MenuList>
      </Paper>
    </Popper>
  )
}
