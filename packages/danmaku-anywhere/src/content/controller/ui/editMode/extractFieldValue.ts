import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import type { FieldId } from './fields'

export interface FieldExtraction {
  xpath: string | null
  regex: string | null
  raw: string | null
  parsed: string | null
  regexMissed: boolean
}

// Cap regex inputs so a pathological pattern can't hang the page tab. A page
// element's textContent can be arbitrarily large; the parsed values we care
// about (titles, episode numbers) are always well under this bound.
const MAX_REGEX_INPUT_LENGTH = 10_000

export function extractFieldValue(
  integration: Integration | undefined,
  fieldId: FieldId
): FieldExtraction {
  const matcher = integration?.policy?.[fieldId]
  const xpath = matcher?.selector?.[0]?.value || null
  const regex = matcher?.regex?.[0]?.value || null

  if (!xpath) {
    return {
      xpath: null,
      regex,
      raw: null,
      parsed: null,
      regexMissed: false,
    }
  }

  const node = getElementByXpath(xpath)
  if (!node) {
    return {
      xpath,
      regex,
      raw: null,
      parsed: null,
      regexMissed: false,
    }
  }

  const raw = node.textContent ?? ''
  const { parsed, regexMissed } = applyRegex(raw, regex)

  return {
    xpath,
    regex,
    raw,
    parsed,
    regexMissed,
  }
}

export function applyRegex(
  raw: string,
  pattern: string | null
): { parsed: string; regexMissed: boolean } {
  if (!pattern) {
    return { parsed: raw, regexMissed: false }
  }
  const input =
    raw.length > MAX_REGEX_INPUT_LENGTH
      ? raw.slice(0, MAX_REGEX_INPUT_LENGTH)
      : raw
  try {
    const re = new RegExp(pattern)
    const match = re.exec(input)
    if (!match) {
      return { parsed: raw, regexMissed: true }
    }
    return { parsed: match[1] ?? match[0], regexMissed: false }
  } catch {
    return { parsed: raw, regexMissed: true }
  }
}
