import { describe, it, expect } from 'vitest'

import type { Selector } from './parse'
import {
  parseMediaNumber,
  parseMediaString,
  parseMultipleRegex,
  parseMediaFromTitle,
} from './parse'

import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

describe('parseMediaNumber', () => {
  it('should parse a valid number', () => {
    const result = parseMediaNumber('Episode 12', '\\d+')
    expect(result).toBe(12)
  })

  it('should prefer the first capture group if it exists', () => {
    // Capture first digit
    const result = parseMediaNumber('a1b2c3d4', 'a(\\d)b(\\d)c(\\d)d(\\d)')
    expect(result).toBe(1)

    // Capture second digit
    const result2 = parseMediaNumber('a1b2c3d4', 'a\\db(\\d)c(\\d)d(\\d)')
    expect(result2).toBe(2)

    // Works with non-capture groups
    const result3 = parseMediaNumber('a1b2c3d4', 'a\\db(?:\\d)c(\\d)d(\\d)')
    expect(result3).toBe(3)
  })

  it('should throw an error if regex does not match', () => {
    expect(() => parseMediaNumber('Episode Twelve', '\\d+')).toThrow()
  })

  it('should throw an error if parsed result is NaN', () => {
    // Matches Twelve, which parses to NaN
    expect(() => parseMediaNumber('Episode Twelve', 'Episode (.+)')).toThrow()
  })
})

describe('parseMediaString', () => {
  it('should parse a valid string', () => {
    const result = parseMediaString('MyGo', '.+')
    expect(result).toBe('MyGo')
  })

  it('should prefer the first capture group if it exists', () => {
    // Capture the name
    const result = parseMediaString('Title: MyGo', 'Title: (.+)')
    expect(result).toBe('MyGo')

    // Capture the title
    const result2 = parseMediaString('Title: MyGo', '(Title): (.+)')
    expect(result2).toBe('Title')

    // Skip non-capture group
    const result3 = parseMediaString('Title: MyGo', '(?:Title): (.+)')
    expect(result3).toBe('MyGo')
  })

  it('should throw an error if regex does not match', () => {
    expect(() => parseMediaString('Title: MyGo', 'Name: (.+)')).toThrow()
  })
})

const createSelector = (value: string, quick?: boolean): Selector => ({
  value,
  quick: quick ?? false,
})

describe('parseMultipleRegex', () => {
  it('should parse using the first matching regex if quick is false', () => {
    const result = parseMultipleRegex(parseMediaString, 'Title: MyGo', [
      createSelector('Name: (.+)'),
      createSelector('Title: (.+)'), // this should match
      createSelector('(.+)'),
    ])
    expect(result).toBe('MyGo')
  })

  it('should prefer selector with the quick flag', () => {
    const result = parseMultipleRegex(parseMediaString, 'Title: MyGo', [
      createSelector('(.+)'),
      createSelector('Title: (.+)', true), // this should match
    ])

    expect(result).toBe('MyGo')
  })

  it('should preserve order if multiple quick selectors are present', () => {
    const result = parseMultipleRegex(parseMediaString, 'Title: MyGo', [
      createSelector('(.+)', true), // this should match
      createSelector('Title: (.+)', true),
    ])

    expect(result).toBe('Title: MyGo')
  })

  it('should throw an error if all regex fail', () => {
    expect(() =>
      parseMultipleRegex(parseMediaString, 'Title: MyGo', [
        createSelector('Name: (.+)'),
        createSelector('Anime: (.+)'),
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
        createSelector(
          '(?<title>.+) - (?<season>.+):[^\\d]*(?<episode>\\d*) - (?<episodeTitle>.+) (\\(\\d+\\))'
        ),
      ]
    )
    expect(result).toEqual(
      new MediaInfo(
        "ONIMAI: I'm Now Your Sister!",
        12,
        'S1',
        true,
        "Mahiro's Future as a Sister"
      )
    )
  })

  it('should throw is title is not present', () => {
    // No groups in regex
    expect(() => parseMediaFromTitle('S1E12', [createSelector('.+')])).toThrow()

    // Title group missing in regex
    expect(() =>
      parseMediaFromTitle('S1E12', [
        createSelector('S(?<season>\\d+)E(?<episode>\\d+)'),
      ])
    ).toThrow()
  })

  it('should not throw if other groups are missing', () => {
    // Episode title is omitted
    const result2 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      createSelector('(?<title>.+) (?<season>S.+)E(?<episode>\\d+)'),
    ])
    expect(result2).toEqual(new MediaInfo('MyGo', 12, 'S1', true))

    // Season is omitted
    const result3 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      createSelector(
        '(?<title>.+) S(\\d)E(?<episode>\\d+ (?<episodeTitle>.+))'
      ),
    ])
    expect(result3).toEqual(
      new MediaInfo('MyGo', 12, undefined, true, 'GoGoGo')
    )

    // Episode number is omitted
    const result4 = parseMediaFromTitle('MyGo S1E12 GoGoGo', [
      createSelector(
        '(?<title>.+) (?<season>S\\d+)E(?:\\d+) (?<episodeTitle>.+)'
      ),
    ])
    expect(result4).toEqual(new MediaInfo('MyGo', 1, 'S1', false, 'GoGoGo'))
  })

  it('should use the first matching regex', () => {
    const result = parseMediaFromTitle('MyGo', [
      createSelector('(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)'), // should not match
      createSelector('(.+)'), // matches, but not used because it's not named
      createSelector('(?<title>.+)'), // should match
    ])
    expect(result).toEqual(new MediaInfo('MyGo', 1, undefined, false))
  })

  it('should use the first matching quick regex', () => {
    const result = parseMediaFromTitle('MyGo', [
      createSelector('(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)'), // should not match
      createSelector('(.+)'), // matches, but not used because it's not named
      createSelector('(?<title>.+)'), // should match, but not used because it's not quick
      createSelector('(?<title>.)', true), // should match the letter 'M'
    ])
    expect(result).toEqual(new MediaInfo('M', 1, undefined, false))
  })

  it('should assume non-episodic if episode is not present', () => {
    const result = parseMediaFromTitle('MyGo', [createSelector('(?<title>.+)')])
    expect(result).toEqual(new MediaInfo('MyGo', 1, undefined, false))
  })

  it('should throw an error if regex does not match', () => {
    expect(() =>
      parseMediaFromTitle('MyGo Season 1 Episode 12', [
        createSelector('(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)'),
      ])
    ).toThrow()
  })

  it('should throw an error if episode or season is NaN', () => {
    // Season is NaN
    expect(() =>
      parseMediaFromTitle('MyGo S一E12', [
        createSelector('(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)'),
      ])
    ).toThrow()

    // Season is NaN but omitted in regex, should not throw
    expect(() =>
      parseMediaFromTitle('MyGo S一E12', [
        createSelector('(?<title>.+) S(.*)E(?<episode>\\d+)'),
      ])
    ).not.toThrow()

    // Episode is NaN
    expect(() =>
      parseMediaFromTitle('MyGo S1E一二', [
        createSelector('(?<title>.+) S(?<season>\\d+)E(?<episode>\\d+)'),
      ])
    ).toThrow()
  })
})
