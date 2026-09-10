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

interface FieldDressing {
  color: string
  label: string
}

interface HighlightElementProps {
  enable: boolean
  onExit: () => void
  onSelect: (xPath: string) => void
  // When set, the picker uses the field color (dashed + halo hover ring)
  // and a top-center status pill instead of the default red box + cancel
  // button. Used by Edit Mode.
  field?: FieldDressing
}

const DefaultHighlightBox = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  border: `2px solid ${red[500]}`,
  borderRadius: theme.shape.borderRadius,
  pointerEvents: 'none',
  zIndex: 2147483647,
}))

const FieldHighlightBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ color }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  border: `2px dashed ${color}`,
  borderRadius: 6,
  pointerEvents: 'none',
  boxShadow: `0 0 0 5px ${color}22, 0 0 30px ${color}55`,
  zIndex: 2147483647,
}))

const HightlightViewport = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: 2147483647,
  border: `2px solid ${theme.palette.primary.main}`,
  boxSizing: 'border-box',
}))

const DimVeil = styled(Box)({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 2147483646,
  boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.18)',
})

const StyledCancelButton = styled(Button)(({ theme }) => ({
  position: 'fixed',
  bottom: 48,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2147483647,
  pointerEvents: 'auto',
  boxShadow: theme.shadows[6],
  fontWeight: 'bold',
  textTransform: 'none',
  paddingLeft: theme.spacing(4),
  paddingRight: theme.spacing(4),
}))

const StatusPillRoot = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 14,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2147483647,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 12px',
  borderRadius: 999,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[6],
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  pointerEvents: 'none',
}))

const EscChip = styled('span')(({ theme }) => ({
  padding: '1px 6px',
  borderRadius: 4,
  background: theme.palette.action.hover,
  fontSize: 10.5,
  fontWeight: 700,
  fontFamily: 'ui-monospace, monospace',
  color: theme.palette.text.secondary,
}))

interface StatusPillProps {
  fieldColor: string
  fieldLabel: string
}

function StatusPill({ fieldColor, fieldLabel }: StatusPillProps) {
  const { t } = useTranslation()
  const isMobile = useIsSmallScreen()
  return (
    <StatusPillRoot>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: fieldColor,
          boxShadow: `0 0 0 5px ${fieldColor}33`,
        }}
      />
      <span>
        {t('editMode.picker.statusPrefix', 'Picking')}{' '}
        <b style={{ color: fieldColor }}>{fieldLabel}</b>{' '}
        {t('editMode.picker.statusSuffix', '· click to select')}
      </span>
      {!isMobile && <EscChip>Esc</EscChip>}
    </StatusPillRoot>
  )
}

export function ElementSelector(props: HighlightElementProps) {
  const { enable, field } = props

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
        // Clicks inside the controller root (cancel button etc.) shouldn't
        // count as a page-element selection. Shadow DOM hides the inner
        // node from event.target, so the root id is the only signal here.
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
      <DimVeil />
      {field ? (
        <FieldHighlightBox ref={highlightRef} color={field.color} />
      ) : (
        <>
          <DefaultHighlightBox ref={highlightRef} />
          <HightlightViewport />
        </>
      )}
      {field ? (
        <StatusPill fieldColor={field.color} fieldLabel={field.label} />
      ) : (
        <StyledCancelButton
          variant="contained"
          color="primary"
          size="large"
          onClick={(e) => {
            e.stopPropagation()
            props.onExit()
          }}
        >
          {t(
            'integrationPolicyPage.editor.cancelSelection',
            'Cancel Selection'
          )}
          {!isMobile && ' (Esc)'}
        </StyledCancelButton>
      )}
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
