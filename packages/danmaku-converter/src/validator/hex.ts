import { z } from 'zod'

export const hex = z
  .string()
  .toUpperCase()
  .regex(/^#[0-9A-F]{6}$/, {
    message: 'Invalid hex color format',
  })
