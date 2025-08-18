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
  .regex(/^#([0-9a-fA-F]{3}){1,2}$/, {
    message: 'Invalid hex color format',
  })
  .transform((hex) => {
    // pad hex to 6 chars and make upper case
    if (hex.length > 6) {
      return hex.toUpperCase()
    }
    const val = hex.split('#')
    return `#${val[1].toUpperCase()}`
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
