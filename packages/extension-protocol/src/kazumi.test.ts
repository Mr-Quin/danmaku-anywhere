import { describe, expect, it } from 'vitest'
import { isXPathPolicy, type KazumiPolicy, zKazumiPolicy } from './kazumi.js'

/**
 * Published Kazumi rules come in two shapes: the classic xpath rules, and
 * newer rules whose search or chapter step runs through an API and leaves
 * the matching XPath selectors empty. The schema has to accept both, keep
 * refusing xpath rules with missing selectors, and strip the API config.
 */

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

const mixedRule = {
  ...xpathRule,
  name: 'dalvdm',
  searchURL: '',
  searchList: '',
  searchName: '',
  searchResult: '',
  searchMode: 'api',
  chapterMode: 'xpath',
  searchApiConfig: apiRule.searchApiConfig,
}

describe('zKazumiPolicy', () => {
  it('accepts xpath rules and defaults both modes to xpath', () => {
    const result = zKazumiPolicy.safeParse(xpathRule)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.searchMode).toBe('xpath')
      expect(result.data.chapterMode).toBe('xpath')
    }
  })

  it('accepts api rules with empty selectors', () => {
    const result = zKazumiPolicy.safeParse(apiRule)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.searchMode).toBe('api')
      expect(result.data.chapterMode).toBe('api')
      expect(result.data.searchURL).toBe('')
      expect(result.data).not.toHaveProperty('searchApiConfig')
      expect(result.data).not.toHaveProperty('chapterApiConfig')
    }
  })

  it('accepts api search with xpath chapters', () => {
    const result = zKazumiPolicy.safeParse(mixedRule)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.searchMode).toBe('api')
      expect(result.data.chapterRoads).toBe(xpathRule.chapterRoads)
    }
  })

  it('rejects an xpath rule with an empty search selector', () => {
    const result = zKazumiPolicy.safeParse({ ...xpathRule, searchURL: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['searchURL'],
      ])
    }
  })

  it('rejects an xpath rule with a missing chapter selector', () => {
    const { chapterRoads: _, ...withoutChapterRoads } = xpathRule
    const result = zKazumiPolicy.safeParse(withoutChapterRoads)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['chapterRoads'],
      ])
    }
  })

  it('still requires chapter selectors when only search is api', () => {
    const result = zKazumiPolicy.safeParse({ ...mixedRule, chapterResult: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['chapterResult'],
      ])
    }
  })

  it('rejects an unknown mode', () => {
    expect(
      zKazumiPolicy.safeParse({ ...xpathRule, searchMode: 'json' }).success
    ).toBe(false)
  })

  it('rejects rules without a name', () => {
    expect(zKazumiPolicy.safeParse({ ...xpathRule, name: '' }).success).toBe(
      false
    )
  })
})

describe('isXPathPolicy', () => {
  it('is true only when both steps use xpath', () => {
    expect(isXPathPolicy(zKazumiPolicy.parse(xpathRule))).toBe(true)
    expect(isXPathPolicy(zKazumiPolicy.parse(apiRule))).toBe(false)
    expect(isXPathPolicy(zKazumiPolicy.parse(mixedRule))).toBe(false)
  })

  it('treats a rule stored before modes existed as xpath', () => {
    const {
      searchMode: _,
      chapterMode: __,
      ...stored
    } = zKazumiPolicy.parse(xpathRule)

    expect(isXPathPolicy(stored as KazumiPolicy)).toBe(true)
  })
})
