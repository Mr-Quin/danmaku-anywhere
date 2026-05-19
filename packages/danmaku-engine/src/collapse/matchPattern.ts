import type { DanmakuFilter } from '../options'
import type { LabeledPattern } from './types'

export interface CompiledPattern {
  pattern: LabeledPattern
  regex?: RegExp
}

export interface CompiledRule {
  rule: DanmakuFilter
  regex?: RegExp
}

function safeCompile(value: string): RegExp | undefined {
  try {
    return new RegExp(value)
  } catch {
    return undefined
  }
}

export function compilePatterns(patterns: LabeledPattern[]): CompiledPattern[] {
  return patterns.map((pattern) => ({
    pattern,
    regex: pattern.type === 'regex' ? safeCompile(pattern.value) : undefined,
  }))
}

export function compileRules(rules: DanmakuFilter[]): CompiledRule[] {
  return rules.map((rule) => ({
    rule,
    regex: rule.type === 'regex' ? safeCompile(rule.value) : undefined,
  }))
}

export function findMatchingPattern(
  text: string,
  compiled: CompiledPattern[]
): CompiledPattern | undefined {
  return compiled.find(({ pattern, regex }) => {
    if (!pattern.enabled) {
      return false
    }
    if (pattern.type === 'regex') {
      return regex ? regex.test(text) : false
    }
    return text.includes(pattern.value)
  })
}

export function matchesAnyRule(
  text: string,
  compiled: CompiledRule[]
): boolean {
  return compiled.some(({ rule, regex }) => {
    if (!rule.enabled) {
      return false
    }
    if (rule.type === 'regex') {
      return regex ? regex.test(text) : false
    }
    return text.includes(rule.value)
  })
}
