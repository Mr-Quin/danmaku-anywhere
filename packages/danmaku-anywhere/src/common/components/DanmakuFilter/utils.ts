import type { LabeledPattern } from '@danmaku-anywhere/danmaku-engine'
import { i18n } from '@/common/localization/i18n'
import { tryCatchSync } from '@/common/utils/tryCatch'

export const isRegex = (pattern: string) => {
  return pattern.startsWith('/') && pattern.endsWith('/') && pattern.length >= 2
}

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: () => string }

export interface ParsedRule {
  type: 'text' | 'regex'
  value: string
}

function isDuplicateRule(
  candidate: ParsedRule,
  existing: { type: 'text' | 'regex'; value: string }[]
): boolean {
  return existing.some(
    (r) => r.type === candidate.type && r.value === candidate.value
  )
}

export function parseRule(
  input: string,
  existing: { type: 'text' | 'regex'; value: string }[]
): ValidationResult<ParsedRule> {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return {
      success: false,
      error: () =>
        i18n.t(
          'danmakuFilter.validation.patternEmpty',
          'Pattern cannot be empty'
        ),
    }
  }
  if (isRegex(trimmed)) {
    const inner = trimmed.slice(1, -1)
    if (inner.length === 0) {
      return {
        success: false,
        error: () =>
          i18n.t(
            'danmakuFilter.validation.patternEmpty',
            'Pattern cannot be empty'
          ),
      }
    }
    const [, err] = tryCatchSync(() => new RegExp(inner))
    if (err) {
      return {
        success: false,
        error: () =>
          i18n.t(
            'danmakuFilter.validation.invalidRegex',
            'Invalid regex {{message}}',
            { message: err.message }
          ),
      }
    }
    const candidate: ParsedRule = { type: 'regex', value: inner }
    if (isDuplicateRule(candidate, existing)) {
      return {
        success: false,
        error: () =>
          i18n.t(
            'danmakuFilter.validation.duplicate',
            'Pattern already exists'
          ),
      }
    }
    return { success: true, value: candidate }
  }
  const candidate: ParsedRule = { type: 'text', value: trimmed }
  if (isDuplicateRule(candidate, existing)) {
    return {
      success: false,
      error: () =>
        i18n.t('danmakuFilter.validation.duplicate', 'Pattern already exists'),
    }
  }
  return { success: true, value: candidate }
}

export function parseLabeledPattern(
  label: string,
  patternInput: string,
  existing: LabeledPattern[]
): ValidationResult<LabeledPattern> {
  const trimmedLabel = label.trim()
  if (trimmedLabel.length === 0) {
    return {
      success: false,
      error: () =>
        i18n.t('danmakuFilter.validation.labelEmpty', 'Label cannot be empty'),
    }
  }
  if (existing.some((p) => p.label === trimmedLabel)) {
    return {
      success: false,
      error: () =>
        i18n.t(
          'danmakuFilter.validation.duplicateLabel',
          'Label already exists'
        ),
    }
  }
  const parsed = parseRule(patternInput, existing)
  if (!parsed.success) {
    return parsed
  }
  return {
    success: true,
    value: {
      ...parsed.value,
      label: trimmedLabel,
      enabled: true,
    },
  }
}

export function ruleDisplay(rule: { type: 'text' | 'regex'; value: string }) {
  return rule.type === 'regex' ? `/${rule.value}/` : rule.value
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}
