import { type ConfigSchema, validateConfig } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import {
  buildDefaultValues,
  configIssueMessage,
  fieldIssueMessage,
  getFieldKind,
  getObjectFields,
  getSelectOptions,
  issueFieldPath,
  mergeConfigValues,
  omitKeys,
  toNumberOrUndefined,
} from './schemaForm'

/**
 * Pure helpers that translate a manifest's JSON-schema `configSchema` into the
 * shape the generic provider config form consumes: field kinds for rendering
 * and react-hook-form default values seeded from stored config + schema
 * defaults. Exercises string/enum/number/boolean/object/array shapes drawn from
 * the real dandanplay and bilibili manifests, labelled enum options
 * (oneOf const/title), and the text and placement of the issues dango's
 * validateConfig reports.
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

describe('getSelectOptions', () => {
  it('labels options from oneOf const/title', () => {
    const schema: ConfigSchema = {
      type: 'integer',
      enum: [0, 1],
      oneOf: [
        { const: 0, title: 'No conversion' },
        { const: 1, title: 'Simplified' },
      ],
    }

    expect(getSelectOptions(schema)).toEqual([
      { value: 0, label: 'No conversion' },
      { value: 1, label: 'Simplified' },
    ])
    expect(getFieldKind(schema)).toBe('select')
  })

  it('treats a oneOf of consts without enum as a select', () => {
    const schema: ConfigSchema = {
      type: 'string',
      oneOf: [{ const: 'xml', title: 'XML' }, { const: 'protobuf' }],
    }

    expect(getSelectOptions(schema)).toEqual([
      { value: 'xml', label: 'XML' },
      { value: 'protobuf', label: 'protobuf' },
    ])
  })

  it('falls back to the raw enum values when no option is labelled', () => {
    expect(
      getSelectOptions({ type: 'string', enum: ['xml', 'protobuf'] })
    ).toEqual([
      { value: 'xml', label: 'xml' },
      { value: 'protobuf', label: 'protobuf' },
    ])
  })

  it('ignores a oneOf that is not a list of options', () => {
    const schema: ConfigSchema = {
      type: 'string',
      enum: ['a'],
      oneOf: [{ type: 'string', minLength: 3 }],
    }

    expect(getSelectOptions(schema)).toEqual([{ value: 'a', label: 'a' }])
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
    expect(toNumberOrUndefined('   ')).toBeUndefined()
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

  it('keeps a stored select value that is one of the labelled options', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          oneOf: [{ const: 'a' }, { const: 'b' }],
        },
      },
    }
    expect(buildDefaultValues(schema, { mode: 'b' })).toEqual({ mode: 'b' })
    expect(buildDefaultValues(schema, { mode: 'c' })).toEqual({ mode: 'a' })
  })

  it('ignores a stored select value that is not one of the enum options', () => {
    const result = buildDefaultValues(ddpSchema, { chConvert: 5 })
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

// The test setup mocks i18n.t to return the key, so messages are asserted by
// the key that was picked.
describe('fieldIssueMessage', () => {
  it('has nothing to say about an empty value', () => {
    const schema: ConfigSchema = { type: 'string', minLength: 5 }
    expect(fieldIssueMessage(schema, '')).toBeNull()
    expect(fieldIssueMessage(schema, undefined)).toBeNull()
  })

  it('names the constraint that failed', () => {
    const text: ConfigSchema = { type: 'string', minLength: 2, maxLength: 4 }
    expect(fieldIssueMessage(text, 'a')).toContain('minLength')
    expect(fieldIssueMessage(text, 'abcde')).toContain('maxLength')
    expect(fieldIssueMessage(text, 'abc')).toBeNull()
    const url: ConfigSchema = { type: 'string', format: 'uri' }
    expect(fieldIssueMessage(url, 'not a url')).toContain('url')
    const bounded: ConfigSchema = { type: 'number', minimum: 1, maximum: 10 }
    expect(fieldIssueMessage(bounded, 0)).toContain('minimum')
    expect(fieldIssueMessage(bounded, 11)).toContain('maximum')
  })

  it('asks for a whole number when an integer field gets a fraction', () => {
    expect(fieldIssueMessage({ type: 'integer' }, 1.5)).toContain('integer')
  })

  it('reports a value outside the options', () => {
    expect(
      fieldIssueMessage(bilibiliSchema.properties?.danmakuFormat ?? {}, 'json')
    ).toContain('enum')
  })
})

describe('configIssueMessage', () => {
  it('lists the alternatives by their titles', () => {
    const schema: ConfigSchema = {
      type: 'object',
      anyOf: [{ required: ['baseUrl'] }, { required: ['appId', 'appSecret'] }],
      properties: {
        baseUrl: { type: 'string', title: 'Base URL' },
        appId: { type: 'string', title: 'App ID' },
        appSecret: { type: 'string', title: 'App Secret' },
      },
    }
    const [issue] = validateConfig(schema, {})

    expect(configIssueMessage(issue, schema)).toContain('requiredAlternatives')
  })
})

describe('issueFieldPath', () => {
  it('puts a missing alternative on the first field of the first alternative', () => {
    const [issue] = validateConfig(
      {
        type: 'object',
        anyOf: [{ required: ['baseUrl'] }, { required: ['appId'] }],
      },
      {}
    )

    expect(issueFieldPath(issue)).toEqual(['baseUrl'])
  })

  it('keeps the path of any other issue', () => {
    const [issue] = validateConfig(ddpSchema, {
      auth: { headers: [{ key: 'X-Token' }] },
    })

    expect(issueFieldPath(issue)).toEqual(['auth', 'headers', 0, 'value'])
  })
})

describe('omitKeys', () => {
  it('leaves out the given keys', () => {
    expect(omitKeys({ a: 1, b: 2 }, new Set(['b']))).toEqual({ a: 1 })
  })
})

describe('mergeConfigValues', () => {
  it('drops empty schema fields and keeps falsy non-empty values', () => {
    const result = mergeConfigValues(
      {},
      { baseUrl: '', chConvert: 0, enabled: false, appId: undefined }
    )
    expect(result).toEqual({ chConvert: 0, enabled: false })
  })

  it('preserves stored keys the form did not touch', () => {
    const result = mergeConfigValues(
      { legacyOnly: 'keep', baseUrl: 'old' },
      { baseUrl: 'new' }
    )
    expect(result).toEqual({ legacyOnly: 'keep', baseUrl: 'new' })
  })

  it('does not resurrect a stored value that was cleared in the form', () => {
    const result = mergeConfigValues({ baseUrl: 'old' }, { baseUrl: '' })
    expect(result).toEqual({})
  })
})
