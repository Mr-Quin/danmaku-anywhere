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

const xpathString = z.string().refine(validateXPath, {
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

const regexString = z.string().optional().default('')

const regexStringArray = () =>
  z.union([z.array(regexString), regexString]).transform((val) => {
    if (typeof val === 'string') {
      return [val]
    }
    return val
  })

export const integrationPolicySchema = z.object({
  // Used to search for danmaku, must be present
  title: z.object({
    selector: xpathSelector,
    regex: regexStringArray(),
  }),
  // If true, only the title is used to parse media information
  // This is for cases where the title contains all the necessary information, e.g. file name
  titleOnly: z.boolean(),
  // Used to get the correct episode in the search results
  // If not present, the media is assumed to be non-episodic
  // Optional, default to 1
  episodeNumber: z.object({
    selector: xpathSelector,
    regex: regexStringArray(),
  }),
  // Reserved
  // Not used for now because season number is typically part of the title
  // Optional, default to 1
  seasonNumber: z.object({
    selector: xpathSelector,
    regex: regexStringArray(),
  }),
  // Used to help determine the correct episode in the search results
  // Optional
  episodeTitle: z.object({
    selector: xpathSelector,
    regex: regexStringArray(),
  }),
})

export type IntegrationPolicy = z.infer<typeof integrationPolicySchema>

export const integrationPolicyItemSchema = z.object({
  name: z.string().min(1),
  policy: integrationPolicySchema,
  id: z.string().uuid().optional().default(getRandomUUID),
})

export type IntegrationPolicyItem = z.infer<typeof integrationPolicyItemSchema>
