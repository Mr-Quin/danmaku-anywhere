import { describe, expect, it } from 'vitest'
import { MediaParser, type MediaParserInput } from './MediaParser'

const parser = new MediaParser()

const createInput = (
  title: string,
  regex: string[] = [],
  extras: Partial<Omit<MediaParserInput, 'title'>> = {}
): MediaParserInput => ({
  title: { value: title, regex },
  ...extras,
})

describe('MediaParser', () => {
  describe('Strategy: User Regex (Named Groups)', () => {
    it('should extract fields and respect user-defined title group', () => {
      const input = createInput('Attack on Titan S4E10 A Sound Argument', [
        '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+) (?<episodeTitle>.*)',
      ])

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Attack on Titan S4',
        episode: 10,
        episodeTitle: 'A Sound Argument',
      })
    })

    it('should stitch Season back into Title if regex splits them', () => {
      const input = createInput('进击的巨人 第四季 第10集', [
        '(?<title>.+) (?<season>第.+季) 第(?<episode>.+)集',
      ])

      expect(parser.parse(input)).toMatchObject({
        originalTitle: '进击的巨人 第四季 第10集',
        searchTitle: '进击的巨人 第四季',
        episode: 10,
      })
    })

    it('should handle Chinese numerals in named groups', () => {
      const input = createInput('My Show 第三集', [
        '(?<title>.+) 第(?<episode>.+)集',
      ])

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'My Show',
        episode: 3,
      })
    })
  })

  describe('Strategy: Heuristics (Title Only)', () => {
    describe('English Patterns', () => {
      it('should handle standard SxxExx format', () => {
        const input = createInput('Breaking Bad S05E14 Ozymandias')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: 'Breaking Bad S05',
          episode: 14,
        })
      })

      it('should handle "Season X Episode Y" format', () => {
        const input = createInput('The Office Season 2 Episode 5')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: 'The Office Season 2',
          episode: 5,
        })
      })

      it('should handle implicit season (Episode only)', () => {
        const input = createInput('One Piece Episode 1000')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: 'One Piece',
          episode: 1000,
        })
      })

      it('should handle condensed SxE format and re-append season', () => {
        const input = createInput('Arcane S2E1 Heavy Is The Crown')

        expect(parser.parse(input)).toMatchObject({
          originalTitle: 'Arcane S2E1 Heavy Is The Crown',
          searchTitle: 'Arcane S2',
          episode: 1,
        })
      })
    })

    describe('Chinese Patterns', () => {
      it('should parse "第X季 第Y集" format', () => {
        const input = createInput('鬼灭之刃 第3季 第5集')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: '鬼灭之刃 第3季',
          episode: 5,
        })
      })

      it('should parse Chinese numerals (第x集)', () => {
        const input = createInput('进击的巨人 第二季 第十二集')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: '进击的巨人 第二季',
          episode: 12,
        })
      })

      it('should handle combined season/episode', () => {
        const input = createInput('Overlord S4第02集')

        expect(parser.parse(input)).toMatchObject({
          searchTitle: 'Overlord S4',
          episode: 2,
        })
      })
    })
  })

  describe('Strategy: Explicit Fields', () => {
    it('should use explicit season/episode over title heuristics', () => {
      const input = createInput('Attack On Titan', [], {
        season: { value: 'Season 5', regex: [] },
        episode: { value: '23', regex: [] },
      })

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Attack On Titan Season 5',
        episode: 23,
      })
    })

    it('should append explicit season even if title looks clean', () => {
      const input = createInput('Stranger Things', [], {
        season: { value: 'S3', regex: [] },
      })

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Stranger Things S3',
      })
    })

    it('should NOT append explicit season if already in title', () => {
      const input = createInput('Stranger Things S3', [], {
        season: { value: 'S3', regex: [] },
      })

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Stranger Things S3', // No double "S3 S3"
      })
    })

    it('should parse explicit elements using their own regex', () => {
      const input = createInput('Some Show', [], {
        season: { value: 'Season: 04', regex: ['Season: (?<season>\\d+)'] },
        episode: { value: 'Ep: 12', regex: ['Ep: (?<episode>\\d+)'] },
      })

      expect(parser.parse(input)).toMatchObject({
        episode: 12,
        searchTitle: 'Some Show S4',
      })
    })
  })

  describe('Normalization & Edge Cases', () => {
    it('should ignore brackets/tags at start of file if episode is elsewhere', () => {
      const input = createInput('[FansubGroup] Narouto S1E05 [1080p]')

      expect(parser.parse(input)).toMatchObject({
        searchTitle: '[FansubGroup] Narouto S1', // S1E05 is truncated, prefix remains
        episode: 5,
      })
    })

    it('should return defaults if nothing found', () => {
      const input = createInput('Just A Movie Title')

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Just A Movie Title',
        episode: undefined,
      })
    })

    it('should handle complex episode titles that contain numbers', () => {
      const input = createInput('Space Odyssey S1E5 A Space Odyssey 2001')

      expect(parser.parse(input)).toMatchObject({
        searchTitle: 'Space Odyssey S1', // Truncates at S1E5
        episode: 5,
      })
    })
  })
})
