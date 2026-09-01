import { Box, useTheme } from '@mui/material'
import { createPortal } from 'react-dom'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export function ViewportIndicator() {
  const theme = useTheme()
  const portal = usePopup.use.highlighterPortal()
  const active = useStore((s) => s.editMode.active)
  const pickTarget = useStore((s) => s.editMode.pickTarget)

  if (!portal || !active) {
    return null
  }

  const color = pickTarget
    ? theme.palette.fieldAccent[pickTarget]
    : theme.palette.primary.main

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483645,
        boxShadow: `inset 0 0 0 3px ${color}, inset 0 0 32px -4px ${color}66`,
        transition: 'box-shadow 0.2s ease',
      }}
    />,
    portal
  )
}
