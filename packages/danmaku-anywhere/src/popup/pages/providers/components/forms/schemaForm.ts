import type { ConfigSchema } from '@mr-quin/dango'

export type FieldKind =
  | 'text'
  | 'number'
  | 'select'
  | 'boolean'
  | 'object'
  | 'array'
  | 'unknown'

export interface FieldDescriptor {
  key: string
  schema: ConfigSchema
  kind: FieldKind
  required: boolean
}

// Empty/invalid number inputs become undefined rather than NaN, which would
// otherwise serialize to null when merged into configValues.
export function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  const trimmed = typeof value === 'string' ? value.trim() : value
  if (trimmed === '') {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function getFieldKind(schema: ConfigSchema): FieldKind {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return 'select'
  }
  switch (schema.type) {
    case 'object':
      return 'object'
    case 'array':
      return 'array'
    case 'boolean':
      return 'boolean'
    case 'integer':
    case 'number':
      return 'number'
    case 'string':
      return 'text'
    default:
      return 'unknown'
  }
}

export function getObjectFields(
  schema: ConfigSchema | undefined
): FieldDescriptor[] {
  if (!schema?.properties) {
    return []
  }
  const required = new Set(schema.required ?? [])
  return Object.entries(schema.properties).map(([key, propSchema]) => ({
    key,
    schema: propSchema,
    kind: getFieldKind(propSchema),
    required: required.has(key),
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// NaN (e.g. from a cleared number input) is not a usable stored value, so it
// falls back to the schema default like a missing value.
function hasStoredValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false
  }
  return !(typeof value === 'number' && Number.isNaN(value))
}

function buildFieldDefault(schema: ConfigSchema, value: unknown): unknown {
  switch (getFieldKind(schema)) {
    case 'object': {
      const stored = isRecord(value) ? value : {}
      const out: Record<string, unknown> = {}
      for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
        out[key] = buildFieldDefault(propSchema, stored[key])
      }
      return out
    }
    case 'array': {
      const stored = Array.isArray(value)
        ? value
        : Array.isArray(schema.default)
          ? schema.default
          : []
      const itemSchema = schema.items
      if (!itemSchema) {
        return stored
      }
      return stored.map((item) => buildFieldDefault(itemSchema, item))
    }
    case 'boolean':
      if (typeof value === 'boolean') {
        return value
      }
      return typeof schema.default === 'boolean' ? schema.default : false
    case 'select':
      if (hasStoredValue(value)) {
        return value
      }
      if (schema.default !== undefined) {
        return schema.default
      }
      return schema.enum?.[0] ?? ''
    case 'number':
      if (hasStoredValue(value)) {
        return value
      }
      return schema.default ?? ''
    default:
      if (hasStoredValue(value)) {
        return value
      }
      return schema.default ?? ''
  }
}

export function buildDefaultValues(
  schema: ConfigSchema | undefined,
  values: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!schema?.properties) {
    return {}
  }
  const safeValues = values ?? {}
  const out: Record<string, unknown> = {}
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    out[key] = buildFieldDefault(propSchema, safeValues[key])
  }
  return out
}
