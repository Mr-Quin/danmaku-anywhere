import { describe, expect, it } from 'vitest'
import { stripExtension } from './stripExtension'

describe('stripExtension', () => {
  it('should strip the extension from a filename', () => {
    expect(stripExtension('test.json')).toBe('test')
  })

  it('should strip the extension from a filename with multiple dots', () => {
    expect(
      stripExtension(
        'Girls Band Cry.S01E01.AVC.FLAC.8bit.Bluray-1080p Remux.mkv'
      )
    ).toBe('Girls Band Cry.S01E01.AVC.FLAC.8bit.Bluray-1080p Remux')
  })

  it('should strip the extension from a filename with no extension', () => {
    expect(stripExtension('test')).toBe('test')
  })
})
