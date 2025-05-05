import { xml2json } from 'xml-js'
import { z } from 'zod'

export const hexToRgb888 = (hex: string) => {
  return parseInt(hex.replace('#', '0x'))
}

export const rgb888ToHex = (rgb: number) => {
  return `#${`000000${rgb.toString(16)}`.slice(-6)}`
}

export const xmlToJSON = async (xml: string) => {
  return JSON.parse(xml2json(xml, { compact: true }))
}

export const zHex = z
  .string()
  .toUpperCase()
  .regex(/^#[0-9A-F]{6}$/, {
    message: 'Invalid hex color format',
  })
export const zRgb888 = z.coerce.number().int().min(0).max(16777215)

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
