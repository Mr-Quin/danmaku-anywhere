import { VodAdapter } from '@dan-uni/dan-any/adapters'
import type { UniChunk } from '@dan-uni/dan-any/core'
import {
  CommentMode,
  hexToRgb888,
  zHex,
  zTime,
} from '@danmaku-anywhere/danmaku-converter'
import { ok, type Result } from '@danmaku-anywhere/result'
import { z } from 'zod'

export const zDanmuIcuDanmaku = z.object({
  code: z.number(),
  name: z.string(),
  danum: z.number(),
  danmuku: z.array(
    z
      .tuple([
        zTime,
        z.string().transform((mode) => {
          switch (mode) {
            case 'top':
              return CommentMode.top
            case 'bottom':
              return CommentMode.bottom
            default:
              return CommentMode.rtl
          }
        }),
        zHex,
        z.string().default(''),
        z.string(),
      ])
      .rest(z.any())
      .transform((data) => {
        const [time, mode, color, , text] = data

        return {
          p: `${time},${mode},${hexToRgb888(color)}`,
          m: text,
        }
      })
  ),
})

export async function getDanmakuFromDanmuIcu(
  uchunk: UniChunk,
  videoId: string,
  domain?: string
): Promise<Result<UniChunk, Error>> {
  try {
    const url = `https://danmu.icu/api/v1/danmaku/${videoId}`
    const response = await fetch(url)

    if (!response.ok) {
      return { success: false, error: new Error(`HTTP ${response.status}`) }
    }

    const json = await response.json()
    await uchunk.import(VodAdapter(json, videoId, domain))

    return ok(uchunk)
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e : new Error(String(e)),
    }
  }
}
