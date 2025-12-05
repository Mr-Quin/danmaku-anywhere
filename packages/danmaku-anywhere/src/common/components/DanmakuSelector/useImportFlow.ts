import JSZip from 'jszip'
import { useRef, useState } from 'react'
import { useFileDragDrop } from '@/common/components/DanmakuSelector/useFileDragDrop'
import { useDanmakuImport } from '@/common/components/ImportPageCore/useDanmakuImport'

function toAbsolutePath(path: string): string {
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

async function extractZipFile(file: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(file)
  const entries = Object.entries(zip.files)

  const files: File[] = []

  for (const [path, zipEntry] of entries) {
    if (zipEntry.dir) {
      continue
    }

    if (!path.endsWith('.json') && !path.endsWith('.xml')) {
      continue
    }

    const blob = await zipEntry.async('blob')
    const extractedFile = new File([blob], toAbsolutePath(path), {
      type: path.endsWith('.xml') ? 'text/xml' : 'application/json',
    })
    files.push(extractedFile)
  }

  return files
}

export const useImportFlow = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  const { handleImportClick, mutate, data, isPending, isError, error, reset } =
    useDanmakuImport()

  const handleFiles = async (files: File[]) => {
    const processedFiles: File[] = []

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        processedFiles.push(...(await extractZipFile(file)))
      } else if (file.webkitRelativePath !== '') {
        // convert the relative path to the file's name
        const path = toAbsolutePath(file.webkitRelativePath)
        const newFile = new File([file], path, {
          type: file.type,
        })
        processedFiles.push(newFile)
      } else {
        processedFiles.push(file)
      }
    }

    mutate(processedFiles)
    setShowResultDialog(true)
  }

  const openFileInput = () => {
    fileInputRef.current?.click()
  }

  const openFolderInput = () => {
    folderInputRef.current?.click()
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
    folderInputRef,
    // Data
    importState: { data, isPending, isError, error },
    // Actions
    openFileInput,
    openFolderInput,
    handleFiles,
    closeDialog,
    confirmImport: handleImportClick,
  }
}
