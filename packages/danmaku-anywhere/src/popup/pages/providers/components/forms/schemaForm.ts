import {
  type ConfigIssue,
  type ConfigSchema,
  validateConfig,
} from '@mr-quin/dango'
import { configIssueMessage } from '@/common/options/providerConfig/issueText'

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

export interface SelectOption {
  value: string | number
  label: string
}

function isOptionValue(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

// JSON Schema's labelled enum: `oneOf: [{ const, title }]`. Only used when
// every branch is such an option, so a oneOf that combines real subschemas is
// not mistaken for a choice list.
function labelledOptions(branches: unknown): SelectOption[] | null {
  if (!Array.isArray(branches) || branches.length === 0) {
    return null
  }
  const options: SelectOption[] = []
  for (const branch of branches) {
    if (!isRecord(branch) || !isOptionValue(branch.const)) {
      return null
    }
    const title = branch.title
    options.push({
      value: branch.const,
      label:
        typeof title === 'string' && title.length > 0
          ? title
          : String(branch.const),
    })
  }
  return options
}

export function getSelectOptions(schema: ConfigSchema): SelectOption[] {
  const labelled =
    labelledOptions(schema.oneOf) ?? labelledOptions(schema.anyOf)
  if (labelled) {
    return labelled
  }
  return (schema.enum ?? [])
    .filter(isOptionValue)
    .map((value) => ({ value, label: String(value) }))
}

export function getFieldKind(schema: ConfigSchema): FieldKind {
  if (getSelectOptions(schema).length > 0) {
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
    case 'select': {
      const values = getSelectOptions(schema).map((option) => option.value)
      if (hasStoredValue(value) && values.some((option) => option === value)) {
        return value
      }
      if (schema.default !== undefined) {
        return schema.default
      }
      return values[0] ?? ''
    }
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

// A required field left empty is reported by the form itself, not here.
export function fieldIssueMessage(
  schema: ConfigSchema,
  value: unknown
): string | null {
  const [issue] = validateConfig(schema, value)
  return issue ? configIssueMessage(issue, schema) : null
}

// Where to show an issue: a missing alternative goes on the first field of the
// first alternative, since the object it belongs to has no input of its own.
export function issueFieldPath(issue: ConfigIssue): ConfigIssue['path'] {
  const alternatives = issue.params?.alternatives
  if (issue.code !== 'requiredAlternatives' || !Array.isArray(alternatives)) {
    return issue.path
  }
  const [first] = alternatives
  const [key] = Array.isArray(first) ? first : []
  return typeof key === 'string' ? [...issue.path, key] : issue.path
}

export function omitKeys(
  values: Record<string, unknown>,
  keys: ReadonlySet<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !keys.has(key))
  )
}

// Schema fields fully replace their stored values, but stored keys the schema
// does not know about are preserved. Empty optional fields are dropped so the
// manifest's own defaults stay authoritative instead of persisting ''.
export function mergeConfigValues(
  stored: Record<string, unknown>,
  config: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(stored)) {
    if (!(key in config)) {
      out[key] = value
    }
  }
  for (const [key, value] of Object.entries(config)) {
    if (value !== '' && value !== undefined) {
      out[key] = value
    }
  }
  return out
}
