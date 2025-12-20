import { i18n } from '@/common/localization/i18n'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { tryCatchSync } from '@/common/utils/tryCatch'

export const isRegex = (pattern: string) => {
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    return true
  }
}

type ValidationResult =
  | {
      success: true
      pattern: string
    }
  | {
      success: false
      error: () => string
    }

export const validateRegex = (
  pattern: string,
  filters: DanmakuOptions['filters']
): ValidationResult => {
  const regexContent = pattern.slice(1, -1)
  if (regexContent.length === 0) {
    return {
      success: false,
      error: () =>
        i18n.t(
          'danmakuFilter.validation.patternEmpty',
          'Pattern cannot be empty'
        ),
    }
  }
  if (
    filters.some(
      (filter) => filter.type === 'regex' && filter.value === regexContent
    )
  ) {
    return {
      success: false,
      error: () =>
        i18n.t('danmakuFilter.validation.duplicate', 'Pattern already exists'),
    }
  }
  const [_, error] = tryCatchSync(() => new RegExp(pattern))

  if (error) {
    return {
      success: false,
      error: () =>
        i18n.t(
          'danmakuFilter.validation.invalidRegex',
          'Invalid regex {{message}}',
          { message: error.message }
        ),
    }
  }
  return {
    success: true,
    pattern: regexContent,
  }
}

export const validatePattern = (
  pattern: string,
  filters: DanmakuOptions['filters']
): ValidationResult => {
  const trimmedPattern = pattern.trim()

  if (pattern.trim().length === 0) {
    return {
      success: false,
      error: () =>
        i18n.t(
          'danmakuFilter.validation.patternEmpty',
          'Pattern cannot be empty'
        ),
    }
  }

  if (
    filters.some(
      (filter) => filter.type === 'text' && filter.value === trimmedPattern
    )
  ) {
    return {
      success: false,
      error: () =>
        i18n.t('danmakuFilter.validation.duplicate', 'Pattern already exists'),
    }
  }

  return {
    success: true,
    pattern: trimmedPattern,
  }
}
