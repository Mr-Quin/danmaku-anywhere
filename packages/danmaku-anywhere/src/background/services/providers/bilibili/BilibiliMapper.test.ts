import type { BilibiliBangumiInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import { describe, expect, it } from 'vitest'
import { BilibiliMapper } from './BilibiliMapper'

type BilibiliEpisode = BilibiliBangumiInfo['episodes'][number]

function makeBilibiliEpisode(show_title: string) {
  return {
    aid: 1,
    cid: 1,
    cover: '',
    long_title: '',
    share_copy: '',
    link: '',
    show_title,
  } as BilibiliEpisode
}

describe('BilibiliMapper.toEpisode', () => {
  it('sets episodeNumber when show_title is a bare ASCII number', () => {
    const result = BilibiliMapper.toEpisode(makeBilibiliEpisode('2'))
    expect(result.episodeNumber).toBe(2)
  })

  it('sets episodeNumber when show_title is a bare number with whitespace', () => {
    const result = BilibiliMapper.toEpisode(makeBilibiliEpisode(' 10 '))
    expect(result.episodeNumber).toBe(10)
  })

  it('sets episodeNumber to 0 when show_title is "0"', () => {
    const result = BilibiliMapper.toEpisode(makeBilibiliEpisode('0'))
    expect(result.episodeNumber).toBe(0)
  })

  it('leaves episodeNumber undefined when show_title has a 第N话 prefix', () => {
    const result = BilibiliMapper.toEpisode(
      makeBilibiliEpisode('第1话 小埋、再一次！')
    )
    expect(result.episodeNumber).toBeUndefined()
  })

  it('leaves episodeNumber undefined when show_title is non-numeric', () => {
    const result = BilibiliMapper.toEpisode(makeBilibiliEpisode('正片'))
    expect(result.episodeNumber).toBeUndefined()
  })

  it('leaves episodeNumber undefined when show_title is empty', () => {
    const result = BilibiliMapper.toEpisode(makeBilibiliEpisode(''))
    expect(result.episodeNumber).toBeUndefined()
  })
})
