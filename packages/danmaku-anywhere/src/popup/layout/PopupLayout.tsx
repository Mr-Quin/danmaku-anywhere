import { Box } from '@mui/material'
import { type PropsWithChildren, useState } from 'react'
import { DevWatermark } from '@/common/components/DevWatermark'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { isDetachedWindow } from '@/popup/utils/isDetachedWindow'
import { resolvePopupSize } from '@/popup/utils/popupSize'

export const PopupLayout = ({ children }: PropsWithChildren<{}>) => {
  const { isMobile } = usePlatformInfo()

  // Resolved once: a content-sized host grows to fit this box, and the box
  // must not shrink back once the viewport follows it.
  const [{ width, height }] = useState(() =>
    resolvePopupSize({
      isMobile,
      isDetached: isDetachedWindow(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
  )

  return (
    <Box
      data-testid="popup-layout"
      sx={{
        width,
        maxWidth: width,
        height,
        maxHeight: height,
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      {children}
      <DevWatermark />
    </Box>
  )
}
