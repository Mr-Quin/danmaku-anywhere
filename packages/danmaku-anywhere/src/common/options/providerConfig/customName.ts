import { serverLabel } from './serverLabel'
import { hasDefaultName } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A name as the store keeps it: trimmed, with a blank name meaning the default
// one. A source without a default name gets its server instead, or its
// manifest id when it has no usable server.
export function normalizeCustomName(config: {
  manifestId: string
  customName: unknown
  configValues: unknown
}): string | null {
  const trimmed =
    typeof config.customName === 'string' ? config.customName.trim() : ''
  if (trimmed !== '') {
    return trimmed
  }
  if (hasDefaultName(config)) {
    return null
  }
  const values = isRecord(config.configValues) ? config.configValues : {}
  return serverLabel(values.danmakuBaseUrl) ?? config.manifestId
}
