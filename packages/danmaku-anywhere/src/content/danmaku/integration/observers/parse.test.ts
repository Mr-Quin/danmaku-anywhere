import { describe, it, expect } from 'vitest'

import {
  parseMediaNumber,
  parseMediaString,
  parseMultipleRegex,
  parseMediaFromTitle,
} from './parse'

import { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'

describe('parseMediaNumber', () => {
  it('should parse a valid number', () => {
    const result = parseMediaNumber('Episode 12', '\\d+')
    expect(result).toBe(12)
  })

  it('should throw an error if regex does not match', () => {
    expect(() => parseMediaNumber('Episode Twelve', '\\d+')).toThrow()
  })

  it('should throw an error if parsed result is NaN', () => {
    expect(() => parseMediaNumber('Episode NaN', 'NaN')).toThrow()
  })
})

describe('parseMediaString', () => {
  it('should parse a valid string', () => {
    const result = parseMediaString('Title: MyGo', 'Title: (.+)')
    expect(result).toBe('MyGo')
  })

  it('should throw an error if regex does not match', () => {
    expect(() => parseMediaString('Title: MyGo', 'Name: (.+)')).toThrow()
  })
})

describe('parseMultipleRegex', () => {
  it('should parse using the first matching regex', () => {
    const result = parseMultipleRegex(parseMediaString, 'Title: MyGo', [
      'Name: (.+)',
      'Title: (.+)',
    ])
    expect(result).toBe('MyGo')
  })

  it('should throw an error if all regex fail', () => {
    expect(() =>
      parseMultipleRegex(parseMediaString, 'Title: MyGo', [
        'Name: (.+)',
        'Anime: (.+)',
      ])
    ).toThrow()
  })
})

describe('parseMediaFromTitle', () => {
  it('should parse media info from title', () => {
    // Episode title is present
    const result = parseMediaFromTitle(
      "ONIMAI: I'm Now Your Sister! - S1:E12 - Mahiro's Future as a Sister (2023)",
      [
        '(?<title>.+) - [^\\d]*(?<season>\\d*):[^\\d]*(?<episode>\\d*) - (?<episodeTitle>.+) (\\(\\d+\\))',
      ]
    )
    expect(result).toEqual(
      new MediaInfo(
        "ONIMAI: I'm Now Your Sister!",
        12,
        1,
        true,
        "Mahiro's Future as a Sister"
      )
    )
  })

  it('should throw is title is not present', () => {
    // No groups in regex
    expect(() => parseMediaFromTitle('S1E12', ['.+'])).toThrow()

    // Title group missing in regex
    expect(() =>
      parseMediaFromTitle('S1E12', ['S(?<season>\\d+)E(?<episode>\\d+)'])
    ).toThrow()
  })

  it('should not throw if other groups are missing', () => {
    // Episode title is omitted
    const result2 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)',
    ])
    expect(result2).toEqual(new MediaInfo('MyGo', 12, 1, true))

    // Season is omitted
    const result3 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      '(?<title>.+) S(\\d)E(?<episode>\\d+ (?<episodeTitle>.+))',
    ])
    expect(result3).toEqual(
      new MediaInfo('MyGo', 12, undefined, true, 'GoGoGo')
    )

    // Episode number is omitted
    const result4 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      '(?<title>.+) S(?<season>\\d+)E(?:\\d+) (?<episodeTitle>.+)',
    ])
    expect(result4).toEqual(new MediaInfo('MyGo', 1, 1, false, 'GoGoGo'))
  })

  it('should use the first matching regex', () => {
    const result = parseMediaFromTitle('MyGo', [
      '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)', // should not match
      '(.+)', // matches, but not used because it's not named
      '(?<title>.+)', // should match
    ])
    expect(result).toEqual(new MediaInfo('MyGo', 1, undefined, false, 'MyGo'))
  })

  it('should assume non-episodic if episode is not present', () => {
    const result = parseMediaFromTitle('MyGo', ['(?<title>.+)'])
    expect(result).toEqual(new MediaInfo('MyGo', 1, undefined, false, 'MyGo'))
  })

  it('should throw an error if regex does not match', () => {
    expect(() =>
      parseMediaFromTitle('MyGo Season 1 Episode 12', [
        '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)',
      ])
    ).toThrow()
  })

  it('should throw an error if episode or season is NaN', () => {
    // Season is NaN
    expect(() =>
      parseMediaFromTitle('MyGo S一E12', [
        '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)',
      ])
    ).toThrow()

    // Season is NaN but omitted in regex, should not throw
    expect(() =>
      parseMediaFromTitle('MyGo S一E12', [
        '(?<title>.+) S(.*)E(?<episode>\\d+)',
      ])
    ).not.toThrow()

    // Episode is NaN
    expect(() =>
      parseMediaFromTitle('MyGo S1E一二', [
        '(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)',
      ])
    ).toThrow()
  })
})
