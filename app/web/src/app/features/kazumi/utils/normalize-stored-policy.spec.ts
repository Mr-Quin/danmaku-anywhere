import type { KazumiPolicy } from '@danmaku-anywhere/extension-protocol'
import { describe, expect, it } from 'vitest'
import { normalizeStoredPolicy } from './normalize-stored-policy'

const storedBeforeModes = {
  api: '4',
  type: 'anime',
  name: '7sefun',
  version: '1.3',
  muliSources: true,
  useWebview: true,
  useNativePlayer: true,
  usePost: false,
  useLegacyParser: false,
  userAgent: '',
  baseURL: 'https://www.7sefun.top/',
  searchURL: 'https://www.7sefun.top/vodsearch/-------------.html?wd=@keyword',
  searchList: '//div',
  searchName: '//div[2]/text()',
  searchResult: '//a',
  chapterRoads: '//div',
  chapterResult: '//a',
  referer: '',
} as KazumiPolicy

describe('normalizeStoredPolicy', () => {
  it('fills in xpath modes for a rule stored before modes existed', () => {
    const policy = normalizeStoredPolicy(storedBeforeModes)

    expect(policy.searchMode).toBe('xpath')
    expect(policy.chapterMode).toBe('xpath')
    expect(policy.searchURL).toBe(storedBeforeModes.searchURL)
  })

  it('returns a stored rule the current schema rejects unchanged', () => {
    const invalid = { ...storedBeforeModes, baseURL: '' }

    expect(normalizeStoredPolicy(invalid)).toBe(invalid)
  })
})
