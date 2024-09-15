import type { PopoverVirtualElement } from '@mui/material'
import { match as matchPinyin } from 'pinyin-pro'
import type { KeyboardEvent } from 'react'

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
  // getBackgroundPage is not available in service worker, also not available in Firefox
  if (import.meta.env.DEV) {
    return chrome.runtime.getBackgroundPage === undefined
  }
  return true
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

export const matchWithPinyin = (inputString: string, searchString: string) => {
  const lowerCaseInputString = inputString.toLocaleLowerCase()
  const lowerCaseSearchString = searchString.toLocaleLowerCase()

  // string search
  if (lowerCaseInputString.includes(lowerCaseSearchString)) return true

  // pinyin match
  const pinyinMatches = matchPinyin(lowerCaseInputString, lowerCaseSearchString)
  return !!pinyinMatches
}

export const getRandomUUID = () => {
  return globalThis.crypto.randomUUID()
}

export const stopKeyboardPropagation = (e: KeyboardEvent) => {
  // prevent keydown event from triggering global shortcuts
  if (e.key === 'Escape' || e.key === 'Enter') return
  e.stopPropagation()
}

export const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export const getElementByXpath = (path: string, parent = window.document) => {
  return document.evaluate(
    path,
    parent,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue
}

export const getFirstElement = (
  selectors: string[],
  parent = window.document
) => {
  for (const p of selectors) {
    const element = getElementByXpath(p, parent)
    if (element) {
      return element
    }
  }
  return null
}
