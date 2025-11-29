import type { PopoverVirtualElement } from '@mui/material'
import { ClickAwayListener } from '@mui/material'
import { useRef, useState } from 'react'
import { usePopup } from '@/content/controller/store/popupStore'
import { ControllerWindow } from '@/content/controller/ui/floatingPanel/ControllerWindow'
import { CONTROLLER_ROOT_ID } from '../common/constants/rootId'
import { FloatingButton } from './floatingButton/FloatingButton'

export const PopupUi = () => {
  const { isOpen, toggleOpen, lock } = usePopup()
  const fallbackAnchorEl = useRef<HTMLButtonElement | null>(null)

  const rootRef = useRef<HTMLElement | null>(
    document.getElementById(CONTROLLER_ROOT_ID)
  )

  const [anchorEl, setAnchorEl] = useState<PopoverVirtualElement | null>(null)

  const handleOpen = (virtualElement: PopoverVirtualElement) => {
    if (!isOpen) {
      setAnchorEl(virtualElement)
    }
    toggleOpen()
  }

  return (
    <ClickAwayListener
      onClickAway={(e) => {
        if (!rootRef.current) {
          // try to find the root element again
          rootRef.current = document.getElementById(CONTROLLER_ROOT_ID)
        }
        // clicking on a dialog within the controller is detected as a click away,
        // so we need to check if the target is within the controller root
        if (rootRef.current && rootRef.current.contains(e.target as Node)) {
          return
        }
        if (!lock) {
          toggleOpen(false)
        }
      }}
    >
      <div>
        <ControllerWindow anchorEl={anchorEl ?? fallbackAnchorEl.current} />
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
