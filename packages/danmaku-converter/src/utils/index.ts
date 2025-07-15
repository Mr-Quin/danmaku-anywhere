import { xml2json } from 'xml-js'
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
 * Convert comments to XML format compatible with DanDanPlay
 */
export const commentsToXml = (comments: Array<{ p: string; m: string }>) => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
  const commentElements = comments
    .map((comment) => {
      // Escape XML special characters in comment text
      const escapedText = comment.m
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

      return `    <d p="${comment.p}">${escapedText}</d>`
    })
    .join('\n')

  return `${xmlHeader}
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
    <mission>0</mission>
    <maxlimit>1500</maxlimit>
    <state>0</state>
    <real_name>0</real_name>
    <source>k-v</source>
${commentElements}
</i>`
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
