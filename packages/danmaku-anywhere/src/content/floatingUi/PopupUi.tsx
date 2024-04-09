import { Box, ClickAwayListener } from '@mui/material'
import { useEffect, useRef } from 'react'

import { PopupTab, usePopup } from '../store/popupStore'

import { FloatingButton } from './floatingButton/FloatingButton'
import { FloatingPanel } from './floatingPanel/FloatingPanel'

const useCloseOnEsc = () => {
  // Close popup when press ESC
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        usePopup.setState({ isOpen: false })
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [])
}

export const PopupUi = () => {
  const { isOpen, tab, setTab } = usePopup()

  useCloseOnEsc()

  const handleClick = () => {
    usePopup.setState({ isOpen: !isOpen })
    // Switch to search tab when open
    if (!isOpen && tab !== PopupTab.Search) {
      setTab(PopupTab.Search)
    }
  }

  const anchorEl = useRef<HTMLButtonElement>(null)

  return (
    <ClickAwayListener onClickAway={() => usePopup.setState({ isOpen: false })}>
      <div>
        <FloatingPanel anchorEl={anchorEl.current} />
        <Box
          position="fixed"
          bottom={(theme) => theme.spacing(12)}
          left={(theme) => theme.spacing(3)}
        >
          <FloatingButton
            ref={anchorEl}
            color="primary"
            size="small"
            onOpen={handleClick}
            isOpen={isOpen}
          />
        </Box>
      </div>
    </ClickAwayListener>
  )
}
