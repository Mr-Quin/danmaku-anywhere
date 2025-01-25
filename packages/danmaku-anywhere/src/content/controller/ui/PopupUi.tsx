import type { PopoverVirtualElement } from '@mui/material'
import { ClickAwayListener } from '@mui/material'
import { useRef, useState } from 'react'

import { FloatingButton } from './floatingButton/FloatingButton'
import { ControlWindow } from './floatingPanel/ControlWindow'

import { usePopup } from '@/content/controller/store/popupStore'

export const PopupUi = () => {
  const { isOpen, toggleOpen, lock } = usePopup()
  const fallbackAnchorEl = useRef<HTMLButtonElement | null>(null)
  const [anchorEl, setAnchorEl] = useState<PopoverVirtualElement | null>(null)

  const handleOpen = (virtualElement: PopoverVirtualElement) => {
    if (!isOpen) {
      setAnchorEl(virtualElement)
    }
    toggleOpen()
  }

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (!lock) {
          toggleOpen(false)
        }
      }}
    >
      <div>
        <ControlWindow anchorEl={anchorEl ?? fallbackAnchorEl.current} />
        <FloatingButton
          color="primary"
          size="small"
          onOpen={handleOpen}
          isOpen={isOpen}
          ref={fallbackAnchorEl}
        />
      </div>
    </ClickAwayListener>
  )
}
