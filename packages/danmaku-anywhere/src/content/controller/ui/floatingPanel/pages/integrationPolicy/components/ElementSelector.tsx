import { Popover, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createVirtualElement } from '@/common/utils/utils'
import { usePopup } from '@/content/controller/store/popupStore'
import { xPath } from './getXPath'

interface HighlightElementProps {
  enable: boolean
  onExit: () => void
  onSelect: (xPath: string) => void
}

export const ElementSelector = (props: HighlightElementProps) => {
  const { enable } = props

  const portal = usePopup.use.highlighterPortal()

  const [{ x, y }, setMousePosition] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const selectedElement = useRef<HTMLElement>(null)
  const text = selectedElement.current?.textContent ?? ''

  useEffect(() => {
    if (!props.enable) return

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }

    const handleClick = (event: MouseEvent) => {
      if (!selectedElement.current) return
      event.preventDefault()
      event.stopImmediatePropagation()
      props.onSelect(xPath(selectedElement.current, true))
      props.onExit()
    }

    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      props.onExit()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick, { capture: true })
    document.addEventListener('contextmenu', handleRightClick)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('contextmenu', handleRightClick)
    }
  }, [props.enable])

  useEffect(() => {
    if (!ref.current) return
    const element = document.elementFromPoint(x, y) as HTMLElement

    if (element) {
      selectedElement.current = element
      const rect = element.getBoundingClientRect()
      if (ref.current) {
        ref.current.style.top = rect.top + 'px'
        ref.current.style.left = rect.left + 'px'
        ref.current.style.width = rect.width + 'px'
        ref.current.style.height = rect.height + 'px'
      }
    }
  }, [x, y])

  if (!enable || !portal) return null

  return createPortal(
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          border: '2px solid red',
          pointerEvents: 'none',
        }}
      />
      <Popover
        open={!!text}
        anchorEl={() => createVirtualElement(x, y)}
        style={{ pointerEvents: 'none' }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        container={portal}
      >
        <Typography>{text}</Typography>
      </Popover>
    </>,
    portal
  )
}
