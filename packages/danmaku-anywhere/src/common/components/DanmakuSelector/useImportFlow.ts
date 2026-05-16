import JSZip from 'jszip'
import { useRef, useState } from 'react'
import { fetchUrlAsFile } from '@/common/components/DanmakuSelector/fetchUrlAsFile'
import { useFileDragDrop } from '@/common/components/DanmakuSelector/useFileDragDrop'
import {
  useDanmakuImport,
  VALID_EXTENSIONS,
} from '@/common/components/ImportPageCore/useDanmakuImport'

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

    const lowerPath = path.toLowerCase()
    if (!VALID_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) {
      continue
    }

    const blob = await zipEntry.async('blob')
    const extractedFile = new File([blob], toAbsolutePath(path), {
      type: lowerPath.endsWith('.xml')
        ? 'text/xml'
        : lowerPath.endsWith('.bin')
          ? 'application/octet-stream'
          : 'application/json',
    })
    files.push(extractedFile)
  }

  return files
}

export const useImportFlow = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)

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

  const openUrlInput = () => {
    setUrlDialogOpen(true)
  }

  const closeUrlInput = () => {
    setUrlDialogOpen(false)
  }

  const importFromUrl = async (url: string, signal: AbortSignal) => {
    const file = await fetchUrlAsFile(url, { signal })
    setUrlDialogOpen(false)
    await handleFiles([file])
  }

  const closeDialog = () => {
    setShowResultDialog(false)
    reset()
  }

  const { isDragging, dragProps } = useFileDragDrop(handleFiles)

  return {
    // State
    showResultDialog,
    urlDialogOpen,
    isDragging,
    dragProps,
    fileInputRef,
    folderInputRef,
    // Data
    importState: { data, isPending, isError, error },
    // Actions
    openFileInput,
    openFolderInput,
    openUrlInput,
    closeUrlInput,
    importFromUrl,
    handleFiles,
    closeDialog,
    confirmImport: handleImportClick,
  }
}
