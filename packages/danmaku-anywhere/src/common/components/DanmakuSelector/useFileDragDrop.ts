import { useEventCallback } from '@mui/material'
import { type DragEvent, useMemo, useState } from 'react'

export const useFileDragDrop = (onFilesSelected: (files: File[]) => void) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleFilesSelected = useEventCallback((files: File[]) => {
    onFilesSelected(files)
  })

  const dragProps = useMemo(() => {
    const handleDragEnter = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.dataTransfer.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const relatedTarget = event.relatedTarget as Node
      if (!event.currentTarget.contains(relatedTarget)) {
        setIsDragging(false)
      }
    }

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) {
        handleFilesSelected(files)
      }
    }

    return {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    }
  }, [handleFilesSelected, setIsDragging])

  return {
    isDragging,
    dragProps,
  }
}
