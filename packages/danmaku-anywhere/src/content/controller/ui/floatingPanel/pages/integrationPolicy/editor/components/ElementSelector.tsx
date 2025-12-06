import { Box, Button, Popover, styled, Typography } from '@mui/material'
import { red } from '@mui/material/colors'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { createVirtualElement } from '@/common/utils/utils'
import { CONTROLLER_ROOT_ID } from '@/content/controller/common/constants/rootId'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { usePopup } from '@/content/controller/store/popupStore'
import { getXPath } from './getXPath'

interface HighlightElementProps {
  enable: boolean
  onExit: () => void
  onSelect: (xPath: string) => void
}

const HighlightBox = styled(Box)(({ theme }) => {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    border: `2px solid ${red[500]}`,
    borderRadius: theme.shape.borderRadius,
    pointerEvents: 'none',
  }
})

const HightlightViewport = styled(Box)(({ theme }) => {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: 2147483647, // Max z-index
    border: `2px solid ${theme.palette.primary.main}`,
    boxSizing: 'border-box',
  }
})

const StyledCancelButton = styled(Button)(({ theme }) => ({
  position: 'fixed',
  bottom: 48,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2147483647, // Max z-index
  pointerEvents: 'auto',
  boxShadow: theme.shadows[6],
  fontWeight: 'bold',
  textTransform: 'none',
  paddingLeft: theme.spacing(4),
  paddingRight: theme.spacing(4),
}))

export const ElementSelector = (props: HighlightElementProps) => {
  const { enable } = props

  const { t } = useTranslation()

  const portal = usePopup.use.highlighterPortal()

  const isMobile = useIsSmallScreen()

  const [{ x, y }, setMousePosition] = useState({ x: 0, y: 0 })

  const highlightRef = useRef<HTMLDivElement>(null)
  const selectedElement = useRef<Element>(null)

  const text = selectedElement.current?.textContent ?? ''

  useEffect(() => {
    if (!props.enable) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }

    const handleClick = (event: MouseEvent) => {
      if (!selectedElement.current) {
        return
      }
      if (
        event.target instanceof HTMLElement &&
        /**
         * This checks if the click is on the cancel button.
         * Since the button is inside shadow DOM, it will not be detected by event.target.
         * And since the button should be the only element (inside the controller root) that can be clicked while the selector is active,
         * we can use the controller root id to check if the click is on the cancel button.
         */
        event.target.id === CONTROLLER_ROOT_ID
      ) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      props.onSelect(getXPath(selectedElement.current, true))
      props.onExit()
    }

    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      props.onExit()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        props.onExit()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick, { capture: true })
    document.addEventListener('contextmenu', handleRightClick, {
      capture: true,
    })
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('contextmenu', handleRightClick, {
        capture: true,
      })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [props.enable])

  useEffect(() => {
    if (!highlightRef.current) {
      return
    }

    const element = document.elementFromPoint(x, y)

    if (element) {
      selectedElement.current = element
      const rect = element.getBoundingClientRect()
      if (highlightRef.current) {
        highlightRef.current.style.top = rect.top + 'px'
        highlightRef.current.style.left = rect.left + 'px'
        highlightRef.current.style.width = rect.width + 'px'
        highlightRef.current.style.height = rect.height + 'px'
      }
    }
  }, [x, y])

  if (!enable || !portal) {
    return null
  }

  return createPortal(
    <>
      <HighlightBox ref={highlightRef} />
      <HightlightViewport />
      <StyledCancelButton
        variant="contained"
        color="primary"
        size="large"
        onClick={(e) => {
          e.stopPropagation()
          props.onExit()
        }}
      >
        {t('integrationPolicyPage.editor.cancelSelection', 'Cancel Selection')}
        {!isMobile && ' (Esc)'}
      </StyledCancelButton>
      <Popover
        open={!!text}
        anchorEl={() => createVirtualElement(x + 10, y + 10)}
        style={{ pointerEvents: 'none' }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        container={portal}
      >
        <Typography sx={{ p: 1 }}>{text}</Typography>
      </Popover>
    </>,
    portal
  )
}
