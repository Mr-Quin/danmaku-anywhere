import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface SandboxedPreviewProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const SandboxedPreview = ({
  children,
  className,
  style,
}: SandboxedPreviewProps) => {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write('<!DOCTYPE html><html><head></head><body></body></html>')
    doc.close()

    const parentHead = document.head
    const iframeHead = doc.head

    Array.from(parentHead.children).forEach((child) => {
      if (
        child.tagName === 'STYLE' ||
        (child.tagName === 'LINK' &&
          (child as HTMLLinkElement).rel === 'stylesheet')
      ) {
        iframeHead.appendChild(child.cloneNode(true))
      }
    })

    const baseStyle = doc.createElement('style')
    baseStyle.textContent = `
      html, body { 
        margin: 0; 
        padding: 0; 
        background-color: transparent !important;
        overflow: hidden;
      }
    `
    iframeHead.appendChild(baseStyle)

    setMountNode(doc.body)
  }, [])

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={style}
      title="Sandboxed Preview"
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  )
}
