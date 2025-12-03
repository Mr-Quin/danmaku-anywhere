import { useRef, useState } from 'react'
import { useFileDragDrop } from '@/common/components/DanmakuSelector/useFileDragDrop'
import { useDanmakuImport } from '@/common/components/ImportPageCore/useDanmakuImport'

export const useImportFlow = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  const { handleImportClick, mutate, data, isPending, isError, error, reset } =
    useDanmakuImport()

  const handleFiles = (files: File[]) => {
    mutate(files)
    setShowResultDialog(true)
  }

  const openFileInput = () => {
    fileInputRef.current?.click()
  }

  const closeDialog = () => {
    setShowResultDialog(false)
    reset()
  }

  const { isDragging, dragProps } = useFileDragDrop(handleFiles)

  return {
    // State
    showResultDialog,
    isDragging,
    dragProps,
    fileInputRef,
    // Data
    importState: { data, isPending, isError, error },
    // Actions
    openFileInput,
    handleFiles,
    closeDialog,
    confirmImport: handleImportClick,
  }
}
