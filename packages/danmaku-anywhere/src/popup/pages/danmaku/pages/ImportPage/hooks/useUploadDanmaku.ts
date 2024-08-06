import { useMutation } from '@tanstack/react-query'
import type { DragEventHandler } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { tryCatch } from '@/common/utils/utils'

export interface FileContent {
  file: string
  // json parsed data
  data: unknown
}

const getJsonFromFile = async (file: FileSystemFileHandle[]) => {
  return Promise.all(
    file.map(async (fileHandle) => {
      const text = await (await fileHandle.getFile()).text()

      return {
        file: fileHandle.name,
        data: JSON.parse(text) as unknown,
      } satisfies FileContent
    })
  )
}

const openFileUpload = async () => {
  const [fileHandles, fileErr] = await tryCatch(() =>
    showOpenFilePicker({
      types: [
        {
          description: 'JSON files',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
      multiple: true,
      excludeAcceptAllOption: true,
    })
  )

  if (fileErr) return null

  return getJsonFromFile(fileHandles)
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
    onError: () => {
      toast.error(t('danmakuPage.upload.alert.parseError'))
    },
  })

  const { isPending, mutate } = useMutation({
    mutationFn: async (data: DataTransferItem[]) => {
      const fileContents = await Promise.all(
        data.map(async (item) => {
          const file = item.getAsFile()!
          const text = await file.text()

          const data = JSON.parse(text)
          return { file: file.name, data }
        })
      )
      return fileContents.filter((content) => content !== null)
    },
    onSuccess: (data) => {
      if (data) options.onData(data)
    },
    onError: () => {
      toast.error(t('danmakuPage.upload.alert.parseError'))
    },
  })

  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const bindDrop = () => {
    const onDrop: DragEventHandler<HTMLElement> = async (e) => {
      e.preventDefault()
      setIsDraggingOver(false)

      const items = [...e.dataTransfer.items].filter(
        (item) => item.kind === 'file' && item.type.match('json')
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
