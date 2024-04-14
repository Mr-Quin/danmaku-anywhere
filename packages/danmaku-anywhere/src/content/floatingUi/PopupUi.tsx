import type { PopoverVirtualElement } from '@mui/material'
import { Box, ClickAwayListener } from '@mui/material'
import { useState } from 'react'

import { PopupTab, usePopup } from '../store/popupStore'

import { FloatingButton } from './floatingButton/FloatingButton'
import { FloatingPanel } from './floatingPanel/FloatingPanel'

export const PopupUi = () => {
  const { isOpen, tab, setTab } = usePopup()

  const [anchorEl, setAnchorEl] = useState<PopoverVirtualElement | null>(null)

  const handleOpen = (virtualElement: PopoverVirtualElement) => {
    setAnchorEl(virtualElement)
    usePopup.setState({ isOpen: !isOpen })
    // Switch to search tab when open
    if (!isOpen && tab !== PopupTab.Search) {
      setTab(PopupTab.Search)
    }
  }

  return (
    <ClickAwayListener onClickAway={() => usePopup.setState({ isOpen: false })}>
      <div>
        <FloatingPanel anchorEl={anchorEl} />
        <Box
          position="fixed"
          bottom={(theme) => theme.spacing(12)}
          left={(theme) => theme.spacing(3)}
        >
          <FloatingButton
            color="primary"
            size="small"
            onOpen={handleOpen}
            isOpen={isOpen}
          />
        </Box>
      </div>
    </ClickAwayListener>
  )
}
