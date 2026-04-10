import { describe, expect, it } from 'vitest'
import { detectPattern, extractEpisodeFromFilename } from './patternUtils'

describe('extractEpisodeFromFilename', () => {
  it('extracts episode from simple numeric placeholder', () => {
    expect(extractEpisodeFromFilename('{episode}.xml', '3.xml')).toBe(3)
    expect(extractEpisodeFromFilename('{episode}.xml', '12.xml')).toBe(12)
  })

  it('extracts episode from zero-padded placeholder', () => {
    expect(extractEpisodeFromFilename('{episode:02d}.xml', '03.xml')).toBe(3)
    expect(extractEpisodeFromFilename('{episode:03d}.xml', '003.xml')).toBe(3)
  })

  it('handles prefix and suffix around placeholder', () => {
    expect(
      extractEpisodeFromFilename('S01E{episode:02d}.xml', 'S01E05.xml')
    ).toBe(5)
    expect(extractEpisodeFromFilename('ep{episode}.ass', 'ep10.ass')).toBe(10)
  })

  it('returns null for non-matching filenames', () => {
    expect(
      extractEpisodeFromFilename('{episode:02d}.xml', 'abc.xml')
    ).toBeNull()
    expect(
      extractEpisodeFromFilename('S01E{episode:02d}.xml', 'S02E05.xml')
    ).toBeNull()
  })

  it('returns null for templates without placeholder', () => {
    expect(extractEpisodeFromFilename('static.xml', 'static.xml')).toBeNull()
  })

  it('rejects wrong digit count for padded placeholder', () => {
    expect(extractEpisodeFromFilename('{episode:02d}.xml', '3.xml')).toBeNull()
    expect(extractEpisodeFromFilename('{episode:03d}.xml', '03.xml')).toBeNull()
  })

  it('handles special regex characters in template', () => {
    expect(
      extractEpisodeFromFilename(
        '[Sub] Title - {episode}.xml',
        '[Sub] Title - 5.xml'
      )
    ).toBe(5)
  })
})

describe('detectPattern', () => {
  it('detects simple numeric pattern', () => {
    expect(detectPattern(['1.xml', '2.xml', '3.xml'])).toBe('{episode}.xml')
  })

  it('detects zero-padded pattern', () => {
    expect(detectPattern(['01.xml', '02.xml', '03.xml'])).toBe(
      '{episode:02d}.xml'
    )
    expect(detectPattern(['001.xml', '002.xml', '003.xml'])).toBe(
      '{episode:03d}.xml'
    )
  })

  it('detects pattern with prefix', () => {
    expect(detectPattern(['S01E01.xml', 'S01E02.xml', 'S01E03.xml'])).toBe(
      'S01E{episode:02d}.xml'
    )
  })

  it('detects pattern with prefix and suffix', () => {
    expect(
      detectPattern(['ep01-sub.ass', 'ep02-sub.ass', 'ep03-sub.ass'])
    ).toBe('ep{episode:02d}-sub.ass')
  })

  it('returns null for single file', () => {
    expect(detectPattern(['01.xml'])).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(detectPattern([])).toBeNull()
  })

  it('returns null for non-numeric varying parts', () => {
    expect(detectPattern(['a.xml', 'b.xml', 'c.xml'])).toBeNull()
  })

  it('returns null for files with no common structure', () => {
    expect(detectPattern(['foo.xml', 'bar.ass'])).toBeNull()
  })

  it('handles mixed digit widths as unpadded', () => {
    expect(detectPattern(['1.xml', '2.xml', '10.xml'])).toBe('{episode}.xml')
  })

  it('detects pattern with resolution suffix', () => {
    expect(
      detectPattern(['ep01_720p.xml', 'ep02_720p.xml', 'ep03_720p.xml'])
    ).toBe('ep{episode:02d}_720p.xml')
  })
})
