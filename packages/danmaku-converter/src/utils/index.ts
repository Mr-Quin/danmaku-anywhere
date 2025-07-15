import { json2xml, xml2json } from 'xml-js'
import { z } from 'zod'

export const stripHtml = (html: string) => {
  const reg = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g
  return html.replace(reg, '')
}

export const hexToRgb888 = (hex: string) => {
  return Number.parseInt(hex.replace('#', '0x'))
}

export const rgb888ToHex = (rgb: number) => {
  return `#${`000000${rgb.toString(16)}`.slice(-6)}`
}

export const xmlToJSON = (xml: string) => {
  return JSON.parse(xml2json(xml, { compact: true }))
}

export const zHex = z
  .string()
  .toUpperCase()
  .regex(/^#[0-9A-F]{6}$/, {
    message: 'Invalid hex color format',
  })
export const zRgb888 = z.coerce
  .number()
  .int()
  .transform((n) => {
    /**
     * sometimes this number is malformed, so instead of rejecting the input,
     * we just force it to be within this range
     * n is between (0) and (16777215)
     */
    return Math.max(Math.min(n, 16777215), 0)
  })

export const zTime = z.coerce.number().min(0)

/**
 * Convert comments to XML format compatible with DanDanPlay using json2xml
 */
export const commentsToXml = (comments: Array<{ p: string; m: string }>) => {
  const xmlStructure = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'UTF-8',
      },
    },
    i: {
      chatserver: { _text: 'chat.bilibili.com' },
      chatid: { _text: '0' },
      mission: { _text: '0' },
      maxlimit: { _text: '1500' },
      state: { _text: '0' },
      real_name: { _text: '0' },
      source: { _text: 'k-v' },
      d: comments.map((comment) => ({
        _attributes: { p: comment.p },
        _text: comment.m,
      })),
    },
  }

  return json2xml(xmlStructure as any, { compact: true, spaces: 4 })
}

/**
 * Convert XML danmaku format back to comments array
 */
export const xmlToComments = (xml: string): Array<{ p: string; m: string }> => {
  const parsed = JSON.parse(xml2json(xml, { compact: true }))

  if (!parsed.i || !parsed.i.d) {
    return []
  }

  // Handle single comment case (not an array)
  const dElements = Array.isArray(parsed.i.d) ? parsed.i.d : [parsed.i.d]

  return dElements.map((comment: any) => ({
    p: comment._attributes?.p || '',
    m: comment._text || '',
  }))
}

/**
 * Copied from danmaku-provider
 */
export enum BiliBiliMediaType {
  Bangumi = 1,
  Movie = 2,
  Documentary = 3,
  Guochuang = 4, // 国创
  TV = 5,
  Variety = 7, // 综艺
}

/**
 * Copied from danmaku-provider
 */
export enum DanDanChConvert {
  None = 0,
  Simplified = 1,
  Traditional = 2,
}
