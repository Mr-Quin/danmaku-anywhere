import { preferredCover, preferredThumbnail } from './subject-images'

/**
 * Cards and thumbnails must request a size-appropriate Bangumi image instead
 * of the full-size cover. These helpers also keep a missing image set from
 * producing a broken URL.
 */

const images = {
  large: 'https://lain.bgm.tv/large.jpg',
  common: 'https://lain.bgm.tv/common.jpg',
  medium: 'https://lain.bgm.tv/medium.jpg',
  small: 'https://lain.bgm.tv/small.jpg',
  grid: 'https://lain.bgm.tv/grid.jpg',
}

describe('subject image variants', () => {
  it('prefers the 400px cover for cards', () => {
    expect(preferredCover(images)).toBe('https://lain.bgm.tv/common.jpg')
  })

  it('prefers the grid thumbnail for small images', () => {
    expect(preferredThumbnail(images)).toBe('https://lain.bgm.tv/grid.jpg')
  })

  it('falls back to a larger variant when smaller ones are missing', () => {
    expect(preferredCover({ large: images.large })).toBe(images.large)
    expect(preferredThumbnail({ medium: images.medium })).toBe(images.medium)
  })

  it('returns an empty string for a missing image set', () => {
    expect(preferredCover(undefined)).toBe('')
    expect(preferredCover(null)).toBe('')
    expect(preferredThumbnail(undefined)).toBe('')
  })
})
