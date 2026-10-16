import {
  type ConfigIssue,
  type ConfigSchema,
  validateConfig,
} from '@mr-quin/dango'
import { effectiveConfigValues } from './builtin'
import type { ProviderConfigDraft } from './schema'
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
  | { kind: 'nameRequired' }

export interface ProviderConfigCheck {
  config: ProviderConfigDraft & { id?: string }
  // Undefined when the manifest is not installed, which leaves the values
  // unchecked rather than invalid
  configSchema: ConfigSchema | undefined
}

// Only a source with a manifest has a default name to fall back on.
export function hasDefaultName(config: { manifestId: string }): boolean {
  return !isLegacyMacCms(config)
}

export function checkProviderConfig({
  config,
  configSchema,
}: ProviderConfigCheck): ProviderConfigIssue[] {
  const issues: ProviderConfigIssue[] = []
  if (config.customName === null && !hasDefaultName(config)) {
    issues.push({ kind: 'nameRequired' })
  }
  for (const issue of validateConfig(
    configSchema,
    effectiveConfigValues(config)
  )) {
    issues.push({ kind: 'config', issue })
  }
  return issues
}

export function configIssues(issues: ProviderConfigIssue[]): ConfigIssue[] {
  return issues.flatMap((issue) => {
    return issue.kind === 'config' ? [issue.issue] : []
  })
}

export function describeIssue(issue: ProviderConfigIssue): string {
  if (issue.kind === 'nameRequired') {
    return 'A name is required'
  }
  const path = issue.issue.path.join('.')
  return path === '' ? issue.issue.message : `${path}: ${issue.issue.message}`
}
