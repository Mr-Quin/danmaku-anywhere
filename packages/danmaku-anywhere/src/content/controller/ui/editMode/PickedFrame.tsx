import { Box, styled } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { getElementByXpath } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import type { FieldId } from './fields'

interface PickedFrameProps {
  fieldId: FieldId
  color: string
  label: string
  xpath: string
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

const FrameLabel = styled('span', {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ color }) => ({
  position: 'fixed',
  padding: '1px 7px',
  borderRadius: '3px 3px 3px 0',
  background: color,
  color: '#fff',
  fontSize: 10.5,
  fontWeight: 700,
  lineHeight: '17px',
  fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  boxShadow: `0 4px 10px -4px ${color}88`,
  pointerEvents: 'none',
  zIndex: 2147483641,
  whiteSpace: 'nowrap',
}))

export function PickedFrame({
  fieldId,
  color,
  label,
  xpath,
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

  const labelTop = Math.max(rect.top - 19, 2)

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
        sx={{
          top: labelTop,
          left: rect.left,
        }}
      >
        {label}
      </FrameLabel>
    </>
  )
}
