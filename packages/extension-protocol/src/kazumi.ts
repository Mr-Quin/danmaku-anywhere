import { z } from 'zod'

export const zKazumiManifest = z.object({
  name: z.string(),
  version: z.string(),
  useNativePlayer: z.boolean(),
  author: z.string(),
  lastUpdate: z.number(),
})

export type KazumiManifest = z.output<typeof zKazumiManifest>

const zKazumiRuleMode = z.enum(['xpath', 'api']).prefault('xpath')

const searchSelectors = [
  'searchURL',
  'searchList',
  'searchName',
  'searchResult',
] as const

const chapterSelectors = ['chapterRoads', 'chapterResult'] as const

type XPathSelector =
  | (typeof searchSelectors)[number]
  | (typeof chapterSelectors)[number]

// A rule that searches or lists chapters through an API leaves the matching
// XPath fields empty, so emptiness is only an error in xpath mode.
export const zKazumiPolicy = z
  .object({
    api: z.string(),
    type: z.string(),
    name: z.string().min(1),
    version: z.string(),
    muliSources: z.boolean().prefault(false),
    useWebview: z.boolean().prefault(false),
    useNativePlayer: z.boolean().prefault(false),
    usePost: z.boolean().prefault(false),
    useLegacyParser: z.boolean().prefault(false),
    userAgent: z.string().prefault(''),
    baseURL: z.string().min(1),
    searchMode: zKazumiRuleMode,
    chapterMode: zKazumiRuleMode,
    searchURL: z.string().prefault(''),
    searchList: z.string().prefault(''),
    searchName: z.string().prefault(''),
    searchResult: z.string().prefault(''),
    chapterRoads: z.string().prefault(''),
    chapterResult: z.string().prefault(''),
    referer: z.string().prefault(''),
  })
  .superRefine((policy, ctx) => {
    const required: XPathSelector[] = []
    if (policy.searchMode === 'xpath') {
      required.push(...searchSelectors)
    }
    if (policy.chapterMode === 'xpath') {
      required.push(...chapterSelectors)
    }
    for (const key of required) {
      if (policy[key] === '') {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in xpath mode`,
        })
      }
    }
  })

export type KazumiPolicy = z.output<typeof zKazumiPolicy>

// Whether the extension's scraper can run a rule: it opens a real tab and
// reads it with XPath, so a step that goes through an API has no page to
// open. Rules stored before the mode fields existed have no mode at all, and
// are xpath rules.
export function isXPathPolicy(policy: KazumiPolicy): boolean {
  return policy.searchMode !== 'api' && policy.chapterMode !== 'api'
}
