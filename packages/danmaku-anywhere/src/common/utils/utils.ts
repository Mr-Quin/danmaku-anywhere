import type { PopoverVirtualElement } from '@mui/material'
import JSZip from 'jszip'
import * as OpenCC from 'opencc-js'
import { match as matchPinyin } from 'pinyin-pro'

export const toArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value]
}

export const validateOrigin = async (origin: string) => {
  try {
    if (!chrome || !chrome.permissions) {
      return
    }
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

export function invariant(
  condition: boolean,
  message: string
): asserts condition {
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

export const sanitizeFilename = (filename: string) => {
  return filename.replace(/[<>:"\/|?*]+/g, '_')
}

// TODO: replace with wicg-file-system-access when it's available in Firefox
export const createDownload = (data: Blob, filename?: string) => {
  const url = URL.createObjectURL(data)

  const dateString = new Date().toISOString().split('T')[0]

  const defaultFileName = `export-${dateString}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename ?? defaultFileName)

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

export const downloadZip = async (
  fileName: string,
  files: {
    name: string
    data: Blob | string
  }[]
) => {
  const zip = new JSZip()

  files.forEach((file) => {
    zip.file(file.name, file.data)
  })

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  await createDownload(zipBlob, `${fileName}.zip`)
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
  try {
    return globalThis.crypto.randomUUID()
  } catch (e) {
    console.warn(
      'Failed to generate UUID using crypto.randomUUID, falling back to Math.random',
      e
    )
    // fallback to Math.random if crypto.randomUUID is not available
    const generateUUID = (): string => {
      const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      return template.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    return generateUUID()
  }
}

export const getElementByXpath = (path: string, parent = window.document) => {
  try {
    return document.evaluate(
      path,
      parent,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue
  } catch {
    return null
  }
}

export const docsLink = (path: string) => {
  return `https://docs.danmaku.weeblify.app/${path}`
}

export const getOS = () => {
  const { userAgent } = navigator
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS')) return 'MacOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Unknown'
}

export const properCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const twToCn = OpenCC.Converter({ from: 'tw', to: 'cn' })
const hkToCn = OpenCC.Converter({ from: 'hk', to: 'cn' })

export const toSimplified = (str: string) => {
  return twToCn(hkToCn(str))
}

export const zip = <T, K, R>(
  a: T[],
  b: K[],
  combinator: (a: T, b: K) => R
): R[] => {
  if (a.length !== b.length) {
    throw new Error('cannot zip 2 arrays of different sizes')
  }

  return a.map((item, i) => {
    return combinator(item, b[i])
  })
}

export const concatArr = <T>(a: T[], b: T[]): T[] => {
  for (const item of b) {
    a.push(item)
  }
  return a
}
