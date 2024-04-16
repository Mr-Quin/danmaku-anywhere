import type { PopoverVirtualElement } from '@mui/material'

import type { NotPromise } from '../types/types'

export const toArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value]
}

export const hasOriginPermission = async (origins: string[]) => {
  return chrome.permissions.contains({
    origins,
  })
}

export const validateOrigin = async (origin: string) => {
  try {
    await chrome.permissions.contains({
      origins: [origin],
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      return e.message
    }
    return 'invalid pattern'
  }
}

export const requestOriginPermission = async (origins: string[]) => {
  return chrome.permissions.request({
    origins,
  })
}

// golang style error handling
export const tryCatch = async <T>(fn: () => Promise<T>) => {
  try {
    return [await fn(), null] as const
  } catch (e) {
    if (!(e instanceof Error)) {
      return [null, new Error('Unknown error')] as const
    }
    return [null, e as Error] as const
  }
}

export const tryCatchSync = <T>(fn: () => NotPromise<T>) => {
  try {
    return [fn(), null] as const
  } catch (e) {
    if (!(e instanceof Error)) {
      return [null, new Error('Unknown error')] as const
    }
    return [null, e as Error] as const
  }
}

export const invariant = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}

export const isServiceWorker = () => {
  // getBackgroundPage is not available in service worker
  return chrome.runtime.getBackgroundPage === undefined
}

export const getEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export const episodeIdToEpisodeNumber = (episodeId: number) => {
  return episodeId % 10000
}

export const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// TODO: replace with wicg-file-system-access when it's available in Firefox
export const createDownload = (data: Blob, filename?: string) => {
  const url = URL.createObjectURL(data)

  const dateString = new Date().toISOString().split('T')[0]

  const defaultFileName = `export-${dateString}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? defaultFileName

  document.body.appendChild(link)

  link.click()

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      resolve()
    }, 100)
  })
}

export const getDistance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

export const createVirtualElement = (
  x: number,
  y: number
): PopoverVirtualElement => {
  return {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      x,
      y,
      top: y,
      right: x,
      bottom: y,
      left: x,
      toJSON: () => ({}),
    }),
    nodeType: Node.ELEMENT_NODE,
  }
}
