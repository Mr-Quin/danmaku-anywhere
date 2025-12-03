import { UploadFile } from '@mui/icons-material'
import { alpha, Box, styled } from '@mui/material'

const StyledOverlayBox = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  border: `2px solid ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
}))

export const DragDropOverlay = ({ in: inProp }: { in: boolean }) => {
  if (!inProp) {
    return null
  }

  return (
    <StyledOverlayBox>
      <UploadFile sx={{ fontSize: 64, color: 'primary.main' }} />
    </StyledOverlayBox>
  )
}
