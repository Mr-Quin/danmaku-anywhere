import { Close, Lock, LockOpen } from '@mui/icons-material'
import { AppBar, IconButton, Toolbar } from '@mui/material'
import type { ReactNode } from 'react'

interface WindowToolbarProps {
  children?: ReactNode
  onClose: () => void
  showLock?: boolean
  onLock?: () => void
  onUnlock?: () => void
  isLocked: boolean
}

export const WindowToolbar = (props: WindowToolbarProps) => {
  const {
    children,
    onClose,
    showLock = false,
    onLock,
    onUnlock,
    isLocked,
  } = props

  const handleLock = () => {
    if (isLocked) {
      onUnlock?.()
    } else {
      onLock?.()
    }
  }

  return (
    <AppBar position="relative">
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        {children}
        <div
          style={{
            marginLeft: 'auto',
          }}
        >
          {showLock && (
            <IconButton
              onClick={handleLock}
              sx={{
                color: isLocked ? 'success.main' : 'text.main',
              }}
            >
              {isLocked ? <Lock /> : <LockOpen />}
            </IconButton>
          )}
          <IconButton edge="end" onClick={onClose}>
            <Close />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
  )
}
