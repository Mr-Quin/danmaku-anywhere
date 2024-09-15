import { z } from 'zod'

import { getElementByXpath, getRandomUUID } from '@/common/utils/utils'

const validateXPath = (value: string) => {
  // Skip validation in non-browser environments since this method relies on document.evaluate
  if (typeof window !== 'object') return true

  try {
    getElementByXpath(value)
    return true
  } catch (error) {
    return false
  }
}

const xpathString = z.string().min(1).refine(validateXPath, {
  message: 'Invalid XPath',
})

const xpathSelector = z
  .union([xpathString, z.array(xpathString)])
  .transform((val) => {
    if (typeof val === 'string') {
      return [val]
    }
    return val
  })

const regexString = (defaultValue: string) =>
  z.preprocess((arg) => {
    if (typeof arg === 'string' && arg === '') {
      return undefined
    } else {
      return arg
    }
  }, z.string().optional().default(defaultValue))

const regexStringArray = (defaultValue: string) =>
  z
    .union([z.array(regexString(defaultValue)), regexString(defaultValue)])
    .transform((val) => {
      if (typeof val === 'string') {
        return [val]
      }
      return val
    })

export const xpathPolicySchema = z.object({
  // Used to search for danmaku, must be present
  title: z.object({
    selector: xpathSelector,
    regex: regexStringArray('.+'),
  }),
  // Used to get the correct episode in the search results
  // If not present, the media is assumed to be non-episodic
  // Optional, default to 1
  episodeNumber: z.object({
    selector: xpathSelector,
    regex: regexStringArray('\\d+'),
  }),
  // Used as metadata
  // Optional, default to 1
  seasonNumber: z.object({
    selector: xpathSelector,
    regex: regexStringArray('\\d+'),
  }),
  // Used to help determine the correct episode in the search results
  // Optional
  episodeTitle: z.object({
    selector: xpathSelector,
    regex: regexStringArray('.+'),
  }),
})

export type XPathPolicy = z.infer<typeof xpathPolicySchema>

export const xpathPolicyItemSchema = z.object({
  name: z.string(),
  policy: xpathPolicySchema,
  id: z.string().uuid().optional().default(getRandomUUID),
})

export type XPathPolicyItem = z.infer<typeof xpathPolicyItemSchema>
