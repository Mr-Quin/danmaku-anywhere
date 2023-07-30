import { useEffect, useRef, useState } from 'react'

interface DomSelectorProps {
  enable: boolean
  onSelect: (el: HTMLElement) => void
}

export const DomSelector = ({ enable, onSelect }: DomSelectorProps) => {
  const [selected, setSelected] = useState<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // get the position and size of the selected element so we can overlay a border
  const computeStyle = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    }
  }

  useEffect(() => {
    if (!enable) return

    const onMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target) return
      console.log('hovering', e.target)
      setSelected(target as HTMLElement)
    }

    const onClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target) return
      if (target === selected) return
      if (target.contains(selected)) return
      if (selected?.contains(target)) return
      setSelected(target as HTMLElement)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
    }
  }, [enable])

  return selected ? (
    <div
      ref={overlayRef}
      style={{
        ...computeStyle(selected),
        position: 'absolute',
        border: '2px solid red',
      }}
    />
  ) : null
}
