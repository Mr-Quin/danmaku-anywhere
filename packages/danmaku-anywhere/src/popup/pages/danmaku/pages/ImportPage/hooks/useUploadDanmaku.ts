import { xmlToJSON } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import type { DragEventHandler } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { tryCatch } from '@/common/utils/utils'

export interface FileContent {
  file: string
  // json parsed data
  data: unknown
}

const getJson = async (text: string, fileName: string) => {
  const isXml = fileName.endsWith('.xml')

  const data: unknown = isXml ? await xmlToJSON(text) : JSON.parse(text)

  return data
}

const processFile = async (file: FileSystemFileHandle[]) => {
  return Promise.all(
    file.map(async (fileHandle) => {
      const text = await (await fileHandle.getFile()).text()

      const data = await getJson(text, fileHandle.name)

      console.debug(data)
      return {
        file: fileHandle.name,
        data,
      } satisfies FileContent
    })
  )
}

const openFileUpload = async () => {
  const [fileHandles, fileErr] = await tryCatch(() =>
    showOpenFilePicker({
      types: [
        {
          description: 'JSON/XML files',
          accept: {
            'application/json': ['.json'],
            'text/xml': ['.xml'],
          },
        },
      ],
      multiple: true,
      excludeAcceptAllOption: true,
    })
  )

  if (fileErr) return null

  return processFile(fileHandles)
}

interface UseUploadDanmakuProps {
  onData: (data: FileContent[]) => void
}

export const useUploadDanmaku = (options: UseUploadDanmakuProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  // Use useMutation to hook into global loading state
  const mutation = useMutation({
    mutationFn: openFileUpload,
    onSuccess: (data) => {
      if (data) options.onData(data)
    },
    onError: (err) => {
      Logger.debug('Error uploading danmaku:', err)
      toast.error(t('danmakuPage.upload.alert.parseError'))
    },
  })

  const { isPending, mutate } = useMutation({
    mutationFn: async (data: DataTransferItem[]) => {
      const fileContents = await Promise.all(
        data.map(async (item) => {
          const file = item.getAsFile()!
          const text = await file.text()

          const data = await getJson(text, file.name)

          return { file: file.name, data }
        })
      )
      return fileContents.filter((content) => content !== null)
    },
    onSuccess: (data) => {
      if (data) options.onData(data)
    },
    onError: (err) => {
      Logger.debug('Error uploading danmaku:', err)
      toast.error(t('danmakuPage.upload.alert.parseError'))
    },
  })

  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const bindDrop = () => {
    const onDrop: DragEventHandler<HTMLElement> = async (e) => {
      e.preventDefault()
      setIsDraggingOver(false)

      const items = [...e.dataTransfer.items].filter(
        (item) => item.kind === 'file' && item.type.match('json|xml')
      )

      mutate(items)
    }

    const onDragOver: DragEventHandler<HTMLElement> = (e) => {
      e.preventDefault()
      setIsDraggingOver(true)
    }

    const onDragLeave: DragEventHandler<HTMLElement> = (e) => {
      e.preventDefault()
      setIsDraggingOver(false)
    }

    return { onDrop, onDragOver, onDragLeave }
  }
  return {
    isLoading: mutation.isPending || isPending,
    selectFiles: mutation.mutate,
    bindDrop,
    isDraggingOver,
  }
}
