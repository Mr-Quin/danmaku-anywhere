import { describe, expect, it } from 'vitest'
import type { OcclusionStatusReason } from './Occlusion.types'
import { occlusionStatusText } from './occlusionStatusText'

/**
 * The user-facing copy shared by the occlusion toasts and the info panel row.
 * Each status reason maps to its own translation key, and a tainted canvas is
 * worded as cross-origin with DRM kept for encrypted media.
 */

const REASONS: OcclusionStatusReason[] = [
  'downloading',
  'init',
  'taint',
  'drm',
  'unreadable',
  'webgpu',
  'segment',
  'unavailable',
]

describe('occlusionStatusText', () => {
  it('gives every reason its own translated copy', () => {
    const keys = REASONS.map((reason) => occlusionStatusText(reason))

    expect(new Set(keys).size).toBe(REASONS.length)
    for (const key of keys) {
      expect(key).toMatch(/^stylePage\.occlusion(Error|Status)\./)
    }
  })

  it('words a tainted canvas as cross-origin and keeps DRM for encrypted media', () => {
    expect(occlusionStatusText('taint')).toBe(
      'stylePage.occlusionError.crossOrigin'
    )
    expect(occlusionStatusText('drm')).toBe('stylePage.occlusionError.drm')
  })
})
