import { useEventCallback } from '@mui/material'
import { type DragEvent, useMemo, useState } from 'react'

async function readAllEntries(
  directoryReader: DirectoryReader
): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = []
  let entries: FileSystemEntry[] = []

  do {
    const { promise, resolve, reject } =
      Promise.withResolvers<FileSystemEntry[]>()
    directoryReader.readEntries(resolve, reject)
    entries = await promise
    allEntries.push(...entries)
  } while (entries.length > 0)

  return allEntries
}

async function getFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const files: File[] = []

  async function readDirectory(entry: FileSystemDirectoryEntry) {
    const directoryReader = entry.createReader()

    const fileEntries = await readAllEntries(directoryReader)

    for (const entry of fileEntries) {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry

        const { promise, resolve, reject } = Promise.withResolvers<File>()

        fileEntry.file(resolve, reject)
        const file = await promise
        const newFile = new File([file], entry.fullPath, { type: file.type })

        files.push(newFile)
      } else if (entry.isDirectory) {
        await readDirectory(entry as FileSystemDirectoryEntry)
      }
    }
  }

  // for some reason, using await in a loop only reads the item in the list of items
  // so using promise.all to concurrently read all items
  await Promise.all(
    [...dataTransfer.items].map(async (item) => {
      const entry = item.webkitGetAsEntry()
      if (!entry) {
        return
      }
      if (entry.isDirectory) {
        await readDirectory(entry as FileSystemDirectoryEntry)
      } else if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry
        const { promise, resolve, reject } = Promise.withResolvers<File>()
        fileEntry.file(resolve, reject)
        files.push(await promise)
      }
    })
  )

  return files
}

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

    const handleDrop = async (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      const files = await getFilesFromDataTransfer(event.dataTransfer)

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
