import type { PopoverVirtualElement } from '@mui/material'
import { Box, ClickAwayListener } from '@mui/material'
import { useRef, useState } from 'react'

import { FloatingButton } from './floatingButton/FloatingButton'
import { FloatingPanel } from './floatingPanel/FloatingPanel'

import { usePopup } from '@/content/controller/store/popupStore'

export const PopupUi = () => {
  const { isOpen, toggleOpen } = usePopup()

  const fallbackAnchorEl = useRef<HTMLButtonElement | null>(null)
  const [anchorEl, setAnchorEl] = useState<PopoverVirtualElement | null>(null)

  const handleOpen = (virtualElement: PopoverVirtualElement) => {
    setAnchorEl(virtualElement)
    toggleOpen()
  }

  return (
    <ClickAwayListener
      onClickAway={() => {
        toggleOpen(false)
      }}
    >
      <div>
        <FloatingPanel anchorEl={anchorEl ?? fallbackAnchorEl.current} />
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
            ref={fallbackAnchorEl}
          />
        </Box>
      </div>
    </ClickAwayListener>
  )
}
