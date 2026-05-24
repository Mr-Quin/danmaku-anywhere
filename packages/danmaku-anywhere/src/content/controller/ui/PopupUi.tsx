import type { PopoverVirtualElement } from '@mui/material'
import { ClickAwayListener } from '@mui/material'
import { Suspense, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { ControllerWindow } from '@/content/controller/ui/floatingPanel/ControllerWindow'
import { CONTROLLER_ROOT_ID } from '../common/constants/rootId'
import { useStore } from '../store/store'
import { FloatingButton } from './floatingButton/FloatingButton'

export const PopupUi = () => {
  const { isOpen, toggleOpen, lock, open, triggerSearchFocus } = usePopup()
  const isPicking = useStore((state) => state.integrationForm.isPicking)
  const editModeActive = useStore((state) => state.editMode.active)
  const { data: options } = useExtensionOptions()
  const { showFloatingButton } = options
  const { getKeyCombo } = useHotkeyOptions()
  const openSearchCombo = getKeyCombo('openSearchPanel')

  useHotkeys(
    openSearchCombo,
    () => {
      open({ tab: PopupTab.Search })
      triggerSearchFocus()
    },
    {
      enabled: !!openSearchCombo,
      preventDefault: true,
      enableOnContentEditable: true,
      enableOnFormTags: true,
    }
  )

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
          rootRef.current = document.getElementById(CONTROLLER_ROOT_ID)
        }
        if (rootRef.current && rootRef.current.contains(e.target as Node)) {
          return
        }
        if (!lock) {
          toggleOpen(false)
        }
      }}
    >
      <div
        style={{
          opacity: isPicking || editModeActive ? 0 : 1,
          pointerEvents: isPicking || editModeActive ? 'none' : 'auto',
          transition: 'opacity 0.2s',
        }}
      >
        <Suspense fallback={null}>
          <ControllerWindow anchorEl={anchorEl ?? fallbackAnchorEl.current} />
        </Suspense>
        {showFloatingButton && (
          <FloatingButton
            color="primary"
            size="small"
            onOpen={handleOpen}
            isOpen={isOpen}
            ref={fallbackAnchorEl}
          />
        )}
      </div>
    </ClickAwayListener>
  )
}
