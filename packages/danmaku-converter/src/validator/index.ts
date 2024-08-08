import { z } from 'zod'

export const zHex = z
  .string()
  .toUpperCase()
  .regex(/^#[0-9A-F]{6}$/, {
    message: 'Invalid hex color format',
  })

export const zRgb888 = z.coerce.number().int().min(0).max(16777215)

export const zTime = z.coerce.number().min(0)
