import type { ConfigSchema } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import {
  buildDefaultValues,
  getFieldKind,
  getObjectFields,
  toNumberOrUndefined,
} from './schemaForm'

/**
 * Pure helpers that translate a manifest's JSON-schema `configSchema` into the
 * shape the generic provider config form consumes: field kinds for rendering
 * and react-hook-form default values seeded from stored config + schema
 * defaults. Exercises string/enum/number/boolean/object/array shapes drawn from
 * the real dandanplay and bilibili manifests.
 */

const ddpSchema: ConfigSchema = {
  type: 'object',
  properties: {
    baseUrl: { type: 'string', title: 'Base URL' },
    appId: { type: 'string', title: 'App ID' },
    auth: {
      type: 'object',
      title: 'Authentication',
      properties: {
        enabled: { type: 'boolean', default: false, title: 'Enable' },
        headers: {
          type: 'array',
          title: 'Headers',
          items: {
            type: 'object',
            required: ['key', 'value'],
            properties: {
              key: { type: 'string', title: 'Header name' },
              value: { type: 'string', title: 'Value' },
            },
          },
        },
      },
    },
    chConvert: {
      type: 'integer',
      enum: [0, 1, 2],
      default: 0,
      title: 'Chinese conversion',
    },
  },
}

const bilibiliSchema: ConfigSchema = {
  type: 'object',
  properties: {
    danmakuFormat: {
      type: 'string',
      enum: ['xml', 'protobuf'],
      default: 'protobuf',
      title: 'Danmaku format',
    },
  },
}

describe('getFieldKind', () => {
  it('classifies an enum as a select regardless of base type', () => {
    expect(getFieldKind({ type: 'string', enum: ['xml', 'protobuf'] })).toBe(
      'select'
    )
    expect(getFieldKind({ type: 'integer', enum: [0, 1] })).toBe('select')
  })

  it('classifies scalar types', () => {
    expect(getFieldKind({ type: 'string' })).toBe('text')
    expect(getFieldKind({ type: 'boolean' })).toBe('boolean')
    expect(getFieldKind({ type: 'integer' })).toBe('number')
    expect(getFieldKind({ type: 'number' })).toBe('number')
  })

  it('classifies object and array', () => {
    expect(getFieldKind({ type: 'object' })).toBe('object')
    expect(getFieldKind({ type: 'array' })).toBe('array')
  })
})

describe('getObjectFields', () => {
  it('returns an empty list for a missing schema', () => {
    expect(getObjectFields(undefined)).toEqual([])
  })

  it('returns one descriptor per property, preserving order', () => {
    const fields = getObjectFields(ddpSchema)
    expect(fields.map((f) => f.key)).toEqual([
      'baseUrl',
      'appId',
      'auth',
      'chConvert',
    ])
    expect(fields.map((f) => f.kind)).toEqual([
      'text',
      'text',
      'object',
      'select',
    ])
  })

  it('marks fields listed in the schema required array', () => {
    const headerItem = ddpSchema.properties?.auth?.properties?.headers?.items
    const fields = getObjectFields(headerItem)
    expect(fields.map((f) => ({ key: f.key, required: f.required }))).toEqual([
      { key: 'key', required: true },
      { key: 'value', required: true },
    ])
    expect(getObjectFields(ddpSchema).every((f) => !f.required)).toBe(true)
  })
})

describe('toNumberOrUndefined', () => {
  it('returns undefined for empty/invalid input and a number otherwise', () => {
    expect(toNumberOrUndefined('')).toBeUndefined()
    expect(toNumberOrUndefined(null)).toBeUndefined()
    expect(toNumberOrUndefined(undefined)).toBeUndefined()
    expect(toNumberOrUndefined('abc')).toBeUndefined()
    expect(toNumberOrUndefined('12')).toBe(12)
    expect(toNumberOrUndefined(3)).toBe(3)
  })
})

describe('buildDefaultValues', () => {
  it('returns an empty object when there is no schema', () => {
    expect(buildDefaultValues(undefined, { foo: 'bar' })).toEqual({})
  })

  it('prefers stored values over schema defaults', () => {
    const result = buildDefaultValues(bilibiliSchema, { danmakuFormat: 'xml' })
    expect(result).toEqual({ danmakuFormat: 'xml' })
  })

  it('falls back to schema default then type-empty', () => {
    const result = buildDefaultValues(ddpSchema, {})
    expect(result).toEqual({
      baseUrl: '',
      appId: '',
      auth: { enabled: false, headers: [] },
      chConvert: 0,
    })
  })

  it('hydrates nested objects and arrays from stored values', () => {
    const result = buildDefaultValues(ddpSchema, {
      baseUrl: 'https://example.test',
      auth: {
        enabled: true,
        headers: [{ key: 'X-Token', value: 'abc' }],
      },
      chConvert: 2,
    })
    expect(result).toEqual({
      baseUrl: 'https://example.test',
      appId: '',
      auth: {
        enabled: true,
        headers: [{ key: 'X-Token', value: 'abc' }],
      },
      chConvert: 2,
    })
  })

  it('falls back to the first enum option when a select has no default', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['a', 'b'] },
      },
    }
    expect(buildDefaultValues(schema, {})).toEqual({ mode: 'a' })
  })

  it('falls back to the default when a stored number is NaN', () => {
    const result = buildDefaultValues(ddpSchema, { chConvert: Number.NaN })
    expect(result.chConvert).toBe(0)
  })

  it('coerces malformed array items into the item shape', () => {
    const result = buildDefaultValues(ddpSchema, {
      auth: { enabled: true, headers: [{ key: 'only-key' }] },
    })
    expect(result.auth).toEqual({
      enabled: true,
      headers: [{ key: 'only-key', value: '' }],
    })
  })
})
