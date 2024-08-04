import { describe, expect, it } from 'vitest'

import {
  customCommentSchema,
  customDanmakuCreateDtoSchema,
} from './customDanmaku'

describe('customCommentSchema', () => {
  it('accepts valid comment', () => {
    const comment = {
      mode: 'rtl',
      time: 10.5,
      color: '#FF5733',
      text: 'Hello World',
      user: 'user1',
    }
    const result = customCommentSchema.parse(comment)
    expect(result).toEqual({
      p: '10.5,1,16734003',
      m: 'Hello World',
    })
  })

  it('rejects invalid color', () => {
    const comment = {
      mode: 'rtl',
      time: 10.5,
      color: 'FF5733',
      text: 'Hello World',
    }
    expect(() => customCommentSchema.parse(comment)).toThrow()
  })

  it('uses default mode if not provided', () => {
    const comment = {
      time: 10.5,
      color: '#FF5733',
      text: 'Hello World',
    }
    const result = customCommentSchema.parse(comment)
    expect(result).toEqual({
      p: '10.5,1,16734003',
      m: 'Hello World',
    })
  })
})

describe('customDanmakuCreateDtoSchema', () => {
  it('accepts valid danmaku', () => {
    const dto = {
      comments: [
        {
          mode: 'rtl',
          time: 10.5,
          color: '#FF5733',
          text: 'Hello World',
        },
      ],
      animeTitle: 'Anime Title',
      episodeTitle: 'Episode Title',
    }

    expect(() => customDanmakuCreateDtoSchema.parse(dto)).not.toThrow()
  })

  it('rejects if no comments are provided', () => {
    const dto = {
      comments: [],
      animeTitle: 'Anime Title',
      episodeTitle: 'Episode Title',
    }
    expect(() => customDanmakuCreateDtoSchema.parse(dto)).toThrow()
  })

  it('rejects if neither episodeTitle nor episodeNumber is provided', () => {
    const dto = {
      comments: [
        {
          mode: 'rtl',
          time: 10.5,
          color: '#FF5733',
          text: 'Hello World',
        },
      ],
      animeTitle: 'Anime Title',
    }
    expect(() => customDanmakuCreateDtoSchema.parse(dto)).toThrow()
  })

  it('accepts if one of episodeNumber or episodeTitle is provided', () => {
    const dtoEpisodeNumber = {
      comments: [
        {
          mode: 'rtl',
          time: 10.5,
          color: '#FF5733',
          text: 'Hello World',
        },
      ],
      animeTitle: 'Anime Title',
      episodeNumber: 1,
    }

    const dtoEpisodeTitle = {
      comments: [
        {
          mode: 'rtl',
          time: 10.5,
          color: '#FF5733',
          text: 'Hello World',
        },
      ],
      animeTitle: 'Anime Title',
      episodeTitle: 'Episode Title',
    }

    expect(() =>
      customDanmakuCreateDtoSchema.parse(dtoEpisodeNumber)
    ).not.toThrow()
    expect(() =>
      customDanmakuCreateDtoSchema.parse(dtoEpisodeTitle)
    ).not.toThrow()
  })
})
