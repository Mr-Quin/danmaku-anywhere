import { describe, expect, it } from 'vitest'
import { zKazumiPolicy } from './schema'

const xpathRule = {
  api: '4',
  type: 'anime',
  name: '7sefun',
  version: '1.3',
  muliSources: true,
  useWebview: true,
  useNativePlayer: true,
  userAgent: '',
  baseURL: 'https://www.7sefun.top/',
  searchURL: 'https://www.7sefun.top/vodsearch/-------------.html?wd=@keyword',
  searchList: '//div[2]/div[2]/div[2]/div[2]/div',
  searchName: '//div[2]/text()',
  searchResult: '//a',
  chapterRoads: '//div[2]/div[2]/div[2]/div/div[2]/div[1]//div',
  chapterResult: '//a',
}

const apiRule = {
  ...xpathRule,
  name: 'xfdmnext',
  baseURL: 'https://next.xifanacg.com/',
  searchURL: '',
  searchList: '',
  searchName: '',
  searchResult: '',
  chapterRoads: '',
  chapterResult: '',
  searchMode: 'api',
  chapterMode: 'api',
  searchApiConfig: {
    request: {
      method: 'POST',
      url: 'https://api.xifanacg.com/rest/v1/rpc/search_animes',
      body: { search_term: '@keyword' },
    },
    listPath: '$[*]',
    namePath: '$.title',
    sourcePath: '$.id',
  },
  chapterApiConfig: {
    request: {
      method: 'POST',
      url: 'https://api.xifanacg.com/rest/v1/rpc/get_anime_detail',
    },
    format: 'nested',
  },
}

describe('zKazumiPolicy', () => {
  it('accepts xpath based rules', () => {
    expect(zKazumiPolicy.safeParse(xpathRule).success).toBe(true)
  })

  it('accepts api mode rules with empty selectors', () => {
    const result = zKazumiPolicy.safeParse(apiRule)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.searchURL).toBe('')
      expect(result.data).toMatchObject({
        searchMode: 'api',
        searchApiConfig: apiRule.searchApiConfig,
        chapterApiConfig: apiRule.chapterApiConfig,
      })
    }
  })

  it('fills in missing optional fields', () => {
    const result = zKazumiPolicy.safeParse({
      api: '8',
      type: 'anime',
      name: 'minimal',
      version: '1.0',
      baseURL: 'https://example.com/',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.searchURL).toBe('')
      expect(result.data.chapterResult).toBe('')
      expect(result.data.muliSources).toBe(false)
      expect(result.data.userAgent).toBe('')
    }
  })

  it('rejects rules without a name', () => {
    expect(zKazumiPolicy.safeParse({ ...xpathRule, name: '' }).success).toBe(
      false
    )
  })
})
