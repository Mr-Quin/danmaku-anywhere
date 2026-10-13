import {
  type ConfigIssue,
  type ConfigSchema,
  validateConfig,
} from '@mr-quin/dango'
import { lockedConfigKeys } from './builtin'
import type { ProviderConfig, ProviderConfigDraft } from './schema'
import { isLegacyMacCms } from './utils'

// Legacy MacCMS has no manifest, so its settings are described here in the
// same dialect the manifests use.
export const LEGACY_MACCMS_CONFIG_SCHEMA: ConfigSchema = {
  type: 'object',
  required: ['danmakuBaseUrl', 'danmuicuBaseUrl'],
  properties: {
    danmakuBaseUrl: { type: 'string' },
    danmuicuBaseUrl: { type: 'string' },
    stripColor: { type: 'boolean' },
  },
}

export type ProviderConfigIssue =
  | { kind: 'config'; issue: ConfigIssue }
  | { kind: 'locked'; key: string }
  | { kind: 'nameRequired' }
  | { kind: 'unknownSource'; manifestId: string }

export interface ProviderConfigCheck {
  // The stored config an edit applies to. Absent for a new config.
  current?: ProviderConfig
  next: ProviderConfigDraft & { id?: string }
  configSchema: ConfigSchema | undefined
}

// Only a source with a manifest has a default name to fall back on.
export function hasDefaultName(config: { manifestId: string }): boolean {
  return !isLegacyMacCms(config)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, i) => isSameValue(item, b[i]))
    )
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => isSameValue(a[key], b[key]))
  }
  return a === b
}

function changedLockedKeys(
  current: ProviderConfig,
  next: Record<string, unknown>
): string[] {
  return [...lockedConfigKeys(current)].filter((key) => {
    return !isSameValue(current.configValues[key], next[key])
  })
}

export function checkProviderConfig({
  current,
  next,
  configSchema,
}: ProviderConfigCheck): ProviderConfigIssue[] {
  const issues: ProviderConfigIssue[] = []
  if (next.customName === null && !hasDefaultName(next)) {
    issues.push({ kind: 'nameRequired' })
  }
  for (const issue of validateConfig(configSchema, next.configValues)) {
    issues.push({ kind: 'config', issue })
  }
  if (current) {
    for (const key of changedLockedKeys(current, next.configValues)) {
      issues.push({ kind: 'locked', key })
    }
  }
  return issues
}

export function describeIssue(issue: ProviderConfigIssue): string {
  switch (issue.kind) {
    case 'config': {
      const path = issue.issue.path.join('.')
      return path === ''
        ? issue.issue.message
        : `${path}: ${issue.issue.message}`
    }
    case 'locked':
      return `${issue.key} cannot be changed on a built-in source`
    case 'nameRequired':
      return 'A name is required'
    case 'unknownSource':
      return `No source "${issue.manifestId}" is installed`
  }
}
