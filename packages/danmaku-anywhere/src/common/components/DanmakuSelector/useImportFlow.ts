import JSZip from 'jszip'
import { useRef, useState } from 'react'
import { fetchUrlAsFile } from '@/common/components/DanmakuSelector/fetchUrlAsFile'
import { useFileDragDrop } from '@/common/components/DanmakuSelector/useFileDragDrop'
import {
  useDanmakuImport,
  VALID_EXTENSIONS,
} from '@/common/components/ImportPageCore/useDanmakuImport'
import { useEnvironmentContext } from '@/common/environment/context'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isStandaloneWindow } from '@/popup/utils/isStandaloneWindow'

const IMPORT_WINDOW_WIDTH = 520
const IMPORT_WINDOW_HEIGHT = 380

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

  const { type: envType } = useEnvironmentContext()
  const { isMobile } = usePlatformInfo()

  function shouldDetach(): boolean {
    return (
      envType === 'popup' &&
      !isMobile &&
      !IS_STANDALONE_RUNTIME &&
      !isStandaloneWindow()
    )
  }

  function detachToImportWindow(autoImport: 'files' | 'folder'): void {
    void chromeRpcClient.openPopupInNewWindow({
      path: `import?autoImport=${autoImport}`,
      width: IMPORT_WINDOW_WIDTH,
      height: IMPORT_WINDOW_HEIGHT,
    })
  }

  const handleFiles = async (files: File[]) => {
    const processedFiles: File[] = []

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip')) {
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
    if (shouldDetach()) {
      detachToImportWindow('files')
      return
    }
    fileInputRef.current?.click()
  }

  const openFolderInput = () => {
    if (shouldDetach()) {
      detachToImportWindow('folder')
      return
    }
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
    // Await handleFiles before closing so a corrupt-zip extraction throw
    // surfaces in the URL dialog instead of closing it silently.
    await handleFiles([file])
    setUrlDialogOpen(false)
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
    willDetach: shouldDetach(),
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
