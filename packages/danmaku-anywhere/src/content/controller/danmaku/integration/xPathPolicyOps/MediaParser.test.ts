import { describe, expect, it } from 'vitest'
import { MediaParser } from './MediaParser'

const parser = new MediaParser()

describe('MediaParser', () => {
  describe('title only', () => {
    it('should extract all fields using a single regex with named groups', () => {
      expect(
        parser.parse({
          title: {
            value: '败犬女主太多了！ 第03集 在战斗开始前就输了',
            regex: ['(?<title>.+) 第(?<episode>\\d+)集 (?<episodeTitle>.*)'],
          },
        })
      ).toMatchObject({
        originalTitle: '败犬女主太多了！ 第03集 在战斗开始前就输了',
        searchTitle: '败犬女主太多了!',
        episode: 3,
        episodeTitle: '在战斗开始前就输了',
      })

      expect(
        parser.parse({
          title: {
            value: 'Attack on Titan S4E10 A Sound Argument',
            regex: [
              '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+) (?<episodeTitle>.*)',
            ],
          },
        })
      ).toMatchObject({
        originalTitle: 'Attack on Titan S4',
        searchTitle: 'Attack on Titan S4',
        episode: 10,
        episodeTitle: 'A Sound Argument',
      })
    })

    it('should extract all fields without user regex', () => {
      expect(
        parser.parse({
          title: {
            value: 'Attack on Titan S4E10 A Sound Argument',
            regex: [],
          },
        })
      ).toMatchObject({
        originalTitle: 'Attack on Titan S4E10 A Sound Argument',
        searchTitle: 'Attack on Titan S4',
        episode: 10,
      })

      expect(
        parser.parse({
          title: {
            value: '败犬女主太多了！ 第03集 在战斗开始前就输了',
            regex: [],
          },
        })
      ).toMatchObject({
        originalTitle: '败犬女主太多了!',
        searchTitle: '败犬女主太多了!',
        episode: 3,
      })
    })
  })
})
