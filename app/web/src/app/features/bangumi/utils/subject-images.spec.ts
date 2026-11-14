import {
  preferredCover,
  preferredPoster,
  preferredThumbnail,
} from './subject-images'

/**
 * Each surface asks for the smallest Bangumi variant that still looks sharp
 * at the size it renders: posters keep the largest cover, cards take the
 * 400px one, thumbnails take the grid crop. These helpers also keep a missing
 * image set from producing a broken URL.
 */

const images = {
  large: 'https://lain.bgm.tv/large.jpg',
  common: 'https://lain.bgm.tv/common.jpg',
  medium: 'https://lain.bgm.tv/medium.jpg',
  small: 'https://lain.bgm.tv/small.jpg',
  grid: 'https://lain.bgm.tv/grid.jpg',
}

describe('subject image variants', () => {
  it('keeps the full-size cover for detail posters', () => {
    expect(preferredPoster(images)).toBe('https://lain.bgm.tv/large.jpg')
  })

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

  it('falls back to a smaller variant when the poster cover is missing', () => {
    expect(preferredPoster({ common: images.common })).toBe(images.common)
    expect(preferredPoster({ medium: images.medium })).toBe(images.medium)
  })

  it('returns an empty string for a missing image set', () => {
    expect(preferredPoster(undefined)).toBe('')
    expect(preferredPoster(null)).toBe('')
    expect(preferredCover(undefined)).toBe('')
    expect(preferredCover(null)).toBe('')
    expect(preferredThumbnail(undefined)).toBe('')
  })
})
