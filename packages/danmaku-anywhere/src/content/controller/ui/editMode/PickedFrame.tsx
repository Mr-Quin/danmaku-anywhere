import { Box, Stack, styled, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { getElementByXpath } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import type { FieldId } from './fields'

interface PickedFrameProps {
  fieldId: FieldId
  color: string
  label: string
  xpath: string
  raw: string | null
  parsed: string | null
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const FrameBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ color }) => ({
  position: 'fixed',
  border: `2px solid ${color}`,
  borderRadius: 4,
  boxShadow: `0 0 0 4px ${color}1f`,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  zIndex: 2147483640,
}))

const FrameLabel = styled(Stack, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ color, theme }) => ({
  position: 'fixed',
  padding: theme.spacing(0.5, 1),
  borderRadius: '4px 4px 4px 0',
  background: color,
  color: '#fff',
  boxShadow: `0 4px 10px -4px ${color}88`,
  pointerEvents: 'none',
  zIndex: 2147483641,
  maxWidth: 360,
}))

export function PickedFrame({
  fieldId,
  color,
  label,
  xpath,
  raw,
  parsed,
}: PickedFrameProps) {
  const setMissingElement = useStore.use.editMode().setMissingElement
  const [rect, setRect] = useState<Rect | null>(null)
  const elementRef = useRef<Element | null>(null)

  useEffect(() => {
    const element = getElementByXpath(xpath)
    if (!(element instanceof Element)) {
      setMissingElement(fieldId, true)
      setRect(null)
      return
    }

    elementRef.current = element
    setMissingElement(fieldId, false)

    const update = () => {
      const el = elementRef.current
      if (!el || !el.isConnected) {
        setMissingElement(fieldId, true)
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    update()

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(element)

    window.addEventListener('scroll', update, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', update, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', update, { capture: true })
      window.removeEventListener('resize', update)
      setMissingElement(fieldId, false)
    }
  }, [xpath, fieldId, setMissingElement])

  if (!rect) {
    return null
  }

  const labelHeight = parsed ? 44 : 22
  const labelTop = Math.max(rect.top - labelHeight - 2, 2)
  const showParsed = parsed !== null && parsed !== raw

  return (
    <>
      <FrameBox
        color={color}
        sx={{
          top: rect.top - 1.5,
          left: rect.left - 1.5,
          width: rect.width + 3,
          height: rect.height + 3,
        }}
      />
      <FrameLabel
        color={color}
        spacing={0.25}
        sx={{
          top: labelTop,
          left: rect.left,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography
            variant="overline"
            sx={{ color: '#fff', lineHeight: 1.1, fontWeight: 700 }}
          >
            {label}
          </Typography>
          {showParsed && (
            <Typography
              variant="caption"
              sx={{
                color: '#fff',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 280,
              }}
              title={parsed ?? ''}
            >
              {parsed}
            </Typography>
          )}
        </Stack>
      </FrameLabel>
    </>
  )
}
