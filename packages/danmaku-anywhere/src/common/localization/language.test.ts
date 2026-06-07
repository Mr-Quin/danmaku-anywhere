import { describe, expect, it } from 'vitest'
import { toManifestLocale } from './language'

describe('toManifestLocale', () => {
  it('maps the bare zh code to zh-CN', () => {
    expect(toManifestLocale('zh')).toBe('zh-CN')
  })

  it('maps any zh variant to zh-CN', () => {
    expect(toManifestLocale('zh-TW')).toBe('zh-CN')
    expect(toManifestLocale('zh-HK')).toBe('zh-CN')
  })

  it('passes other language codes through unchanged', () => {
    expect(toManifestLocale('en')).toBe('en')
  })

  it('falls back to the default locale when language is unset', () => {
    expect(toManifestLocale(undefined)).toBe('en')
    expect(toManifestLocale('')).toBe('en')
  })
})
