import type { ConfigSchema } from '@mr-quin/dango'
import { i18n } from '@/common/localization/i18n'
import { tryCatchSync } from '@/common/utils/tryCatch'

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
      const options = schema.enum ?? []
      if (hasStoredValue(value) && options.includes(value)) {
        return value
      }
      if (schema.default !== undefined) {
        return schema.default
      }
      return options[0] ?? ''
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

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function numberConstraint(
  schema: ConfigSchema,
  key: string
): number | undefined {
  const value = schema[key]
  return typeof value === 'number' ? value : undefined
}

function validateString(schema: ConfigSchema, value: string): string | null {
  const minLength = numberConstraint(schema, 'minLength')
  if (minLength !== undefined && value.length < minLength) {
    return i18n.t(
      'providers.editor.validation.minLength',
      'Must be at least {{min}} characters',
      { min: minLength }
    )
  }
  const maxLength = numberConstraint(schema, 'maxLength')
  if (maxLength !== undefined && value.length > maxLength) {
    return i18n.t(
      'providers.editor.validation.maxLength',
      'Must be at most {{max}} characters',
      { max: maxLength }
    )
  }
  const pattern = schema.pattern
  if (typeof pattern === 'string' && pattern.length > 0) {
    const [regex] = tryCatchSync(() => new RegExp(pattern))
    if (regex && !regex.test(value)) {
      return i18n.t(
        'providers.editor.validation.pattern',
        'Must match the pattern {{pattern}}',
        { pattern }
      )
    }
  }
  if (schema.format === 'uri' || schema.format === 'url') {
    const [, error] = tryCatchSync(() => new URL(value))
    if (error) {
      return i18n.t('providers.editor.validation.url', 'Not a valid URL')
    }
  }
  return null
}

function validateNumber(schema: ConfigSchema, value: number): string | null {
  const minimum = numberConstraint(schema, 'minimum')
  if (minimum !== undefined && value < minimum) {
    return i18n.t(
      'providers.editor.validation.minimum',
      'Must be at least {{min}}',
      { min: minimum }
    )
  }
  const maximum = numberConstraint(schema, 'maximum')
  if (maximum !== undefined && value > maximum) {
    return i18n.t(
      'providers.editor.validation.maximum',
      'Must be at most {{max}}',
      { max: maximum }
    )
  }
  if (schema.type === 'integer' && !Number.isInteger(value)) {
    return i18n.t(
      'providers.editor.validation.integer',
      'Must be a whole number'
    )
  }
  return null
}

// Empty values are valid here; `required` is enforced separately so optional
// fields can stay blank without tripping their constraints.
export function validateScalar(
  schema: ConfigSchema,
  value: unknown
): string | null {
  if (isEmptyValue(value)) {
    return null
  }
  if (typeof value === 'string') {
    return validateString(schema, value)
  }
  if (typeof value === 'number') {
    return validateNumber(schema, value)
  }
  return null
}

export interface ConfigValueError {
  path: string
  message: string
}

function joinPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`
}

function collectErrors(
  schema: ConfigSchema,
  value: unknown,
  path: string,
  errors: ConfigValueError[]
): void {
  switch (getFieldKind(schema)) {
    case 'object': {
      collectObjectErrors(schema, isRecord(value) ? value : {}, path, errors)
      return
    }
    case 'array': {
      const itemSchema = schema.items
      if (!itemSchema || !Array.isArray(value)) {
        return
      }
      value.forEach((item, index) => {
        collectErrors(itemSchema, item, joinPath(path, String(index)), errors)
      })
      return
    }
    default: {
      const message = validateScalar(schema, value)
      if (message) {
        errors.push({ path, message })
      }
    }
  }
}

function collectObjectErrors(
  schema: ConfigSchema,
  record: Record<string, unknown>,
  path: string,
  errors: ConfigValueError[]
): void {
  const required = new Set(schema.required ?? [])
  for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
    const childPath = joinPath(path, key)
    const childValue = record[key]
    if (isEmptyValue(childValue)) {
      if (required.has(key)) {
        errors.push({
          path: childPath,
          message: i18n.t(
            'providers.editor.validation.required',
            'This field is required'
          ),
        })
      }
      continue
    }
    collectErrors(propSchema, childValue, childPath, errors)
  }
}

export function validateConfigValues(
  schema: ConfigSchema | undefined,
  values: Record<string, unknown>
): ConfigValueError[] {
  if (!schema?.properties) {
    return []
  }
  const errors: ConfigValueError[] = []
  collectObjectErrors(schema, values, '', errors)
  return errors
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
