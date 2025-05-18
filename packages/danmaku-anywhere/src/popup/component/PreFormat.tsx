import { ContentCopy } from '@mui/icons-material'
import { Box, IconButton, styled, useTheme } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'

type PreFormatProps = {
  variant?: 'normal' | 'error'
  children: ReactNode
  sx?: SxProps<Theme>
  disableCopy?: boolean
}

const StyledPreFormatBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{
  variant?: 'normal' | 'error'
}>(({ theme, variant }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  overflow: 'auto',
  maxHeight: 200,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[100],
  border:
    variant === 'error' ? `1px solid ${theme.palette.error.main}` : 'none',
  borderRadius: theme.shape.borderRadius,

  '&:focus, &:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
  },
}))

export const PreFormat = ({
  variant,
  sx,
  children,
  disableCopy,
}: PreFormatProps) => {
  const theme = useTheme()
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    if (preRef.current) {
      try {
        await navigator.clipboard.writeText(preRef.current.innerText)
      } catch (_) {
        // ignore error
      }
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault()
      if (preRef.current) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(preRef.current)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }

  return (
    <StyledPreFormatBox
      variant={variant}
      sx={sx}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {!disableCopy && (
        <IconButton
          onClick={handleCopy}
          size="small"
          sx={{
            position: 'absolute',
            zIndex: 1,
            top: theme.spacing(0.5),
            right: theme.spacing(0.5),
            p: 1,
          }}
        >
          <ContentCopy fontSize="small" />
        </IconButton>
      )}
      <pre
        ref={preRef}
        style={{
          fontSize: theme.typography.caption.fontSize,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: variant === 'error' ? 'red' : 'inherit',
        }}
      >
        {children}
      </pre>
    </StyledPreFormatBox>
  )
}
