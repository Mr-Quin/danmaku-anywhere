import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTab } from '../utils.js'
import { isXPathPolicy, kazumiGetChapters, kazumiSearch } from './tasks.js'

/**
 * The scraper only knows how to read a page with XPath. A rule whose search
 * or chapter step runs through an API must be refused up front with a clear
 * error, before any tab is opened on its empty URL.
 */

vi.mock('../utils.js', () => ({
  createTab: vi.fn(),
  createJob: vi.fn(),
  Logger: { debug: vi.fn() },
}))

const xpathPolicy: KazumiPolicy = {
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
  searchMode: 'xpath',
  chapterMode: 'xpath',
  searchURL: 'https://www.7sefun.top/vodsearch/-------------.html?wd=@keyword',
  searchList: '//div',
  searchName: '//div[2]/text()',
  searchResult: '//a',
  chapterRoads: '//div',
  chapterResult: '//a',
  referer: '',
}

const apiSearchPolicy: KazumiPolicy = {
  ...xpathPolicy,
  name: 'dalvdm',
  searchMode: 'api',
  searchURL: '',
  searchList: '',
  searchName: '',
  searchResult: '',
}

const apiChapterPolicy: KazumiPolicy = {
  ...xpathPolicy,
  name: 'xfdmnext',
  chapterMode: 'api',
  chapterRoads: '',
  chapterResult: '',
}

describe('isXPathPolicy', () => {
  it('is true only when both steps use xpath', () => {
    expect(isXPathPolicy(xpathPolicy)).toBe(true)
    expect(isXPathPolicy(apiSearchPolicy)).toBe(false)
    expect(isXPathPolicy(apiChapterPolicy)).toBe(false)
  })
})

describe('api mode refusal', () => {
  beforeEach(() => {
    vi.mocked(createTab).mockReset()
  })

  it('kazumiSearch refuses an api search rule without opening a tab', async () => {
    await expect(kazumiSearch('keyword', apiSearchPolicy)).rejects.toThrow(
      /searches through an API/
    )
    expect(createTab).not.toHaveBeenCalled()
  })

  it('kazumiGetChapters refuses an api chapter rule without opening a tab', async () => {
    await expect(
      kazumiGetChapters('https://example.com/show', apiChapterPolicy)
    ).rejects.toThrow(/lists chapters through an API/)
    expect(createTab).not.toHaveBeenCalled()
  })

  it('kazumiGetChapters still runs for an api search rule with xpath chapters', async () => {
    vi.mocked(createTab).mockRejectedValue(new Error('tab opened'))

    await expect(
      kazumiGetChapters('https://example.com/show', apiSearchPolicy)
    ).rejects.toThrow('tab opened')
    expect(createTab).toHaveBeenCalledWith('https://example.com/show')
  })
})

describe('rules stored before modes existed', () => {
  const { searchMode: _, chapterMode: __, ...withoutModes } = xpathPolicy
  const storedPolicy = withoutModes as KazumiPolicy

  beforeEach(() => {
    vi.mocked(createTab).mockReset()
    vi.mocked(createTab).mockRejectedValue(new Error('tab opened'))
  })

  it('isXPathPolicy treats a missing mode as xpath', () => {
    expect(isXPathPolicy(storedPolicy)).toBe(true)
  })

  it('kazumiSearch still opens the search page', async () => {
    await expect(kazumiSearch('keyword', storedPolicy)).rejects.toThrow(
      'tab opened'
    )
    expect(createTab).toHaveBeenCalledTimes(1)
  })

  it('kazumiGetChapters still opens the content page', async () => {
    await expect(
      kazumiGetChapters('https://example.com/show', storedPolicy)
    ).rejects.toThrow('tab opened')
    expect(createTab).toHaveBeenCalledWith('https://example.com/show')
  })
})
