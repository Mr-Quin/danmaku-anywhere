import { z } from 'zod'

import { getElementByXpath, getRandomUUID } from '@/common/utils/utils'

const validateXPath =
  ({
    allowEmptyString,
  }: {
    allowEmptyString?: boolean
  } = {}) =>
  (value: string) => {
    // Skip validation in non-browser environments since this method relies on document.evaluate
    if (typeof window !== 'object') return true
    if (allowEmptyString) {
      if (value === '') return true
    }

    try {
      getElementByXpath(value)
      return true
    } catch (error) {
      return false
    }
  }

const xpathString = z
  .string()
  .refine(validateXPath({ allowEmptyString: true }), {
    message: 'Invalid XPath',
  })

const nonEmptyXPathString = z.string().min(1).refine(validateXPath(), {
  message: 'Invalid XPath',
})

const regexString = z.string()

const xpathArray = z.array(xpathString)
const regexArray = z.array(regexString)

const matcher = z.object({
  selector: xpathArray,
  regex: regexArray,
})

export const integrationPolicySchema = z.object({
  title: z.object({
    selector: z.array(nonEmptyXPathString).min(1),
    regex: z.array(z.string().min(1)).min(1),
  }),
  titleOnly: z.boolean(),
  episode: matcher,
  season: matcher,
  episodeTitle: matcher,
})

export type IntegrationPolicy = z.infer<typeof integrationPolicySchema>

export const integrationPolicyItemSchema = z.object({
  name: z.string().min(1),
  policy: integrationPolicySchema,
  id: z.string().uuid().optional().default(getRandomUUID),
})

export type IntegrationPolicyItem = z.infer<typeof integrationPolicyItemSchema>
