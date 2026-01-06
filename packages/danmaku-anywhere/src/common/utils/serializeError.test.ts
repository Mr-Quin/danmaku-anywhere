import { describe, expect, it } from 'vitest'
import {
  deserializeError,
  serializeError,
  serializeErrorJson,
} from './serializeError'

describe('serializeError', () => {
  it('should serialize a standard Error object', () => {
    const error = new Error('test message')
    error.name = 'TestError'

    const serialized = serializeError(error) as any

    expect(serialized).toMatchObject({
      type: 'error',
      name: 'TestError',
      message: 'test message',
    })
    expect(serialized.stack).toBeDefined()
    expect(typeof serialized.stack).toBe('string')
  })

  it('should serialize a string', () => {
    const error = 'error string'
    const serialized = serializeError(error)

    expect(serialized).toEqual({
      type: 'string',
      message: 'error string',
    })
  })

  it('should serialize a number', () => {
    const error = 123
    const serialized = serializeError(error)

    expect(serialized).toEqual({
      type: 'number',
      message: '123',
    })
  })

  it('should serialize an object', () => {
    const error = { foo: 'bar' }
    const serialized = serializeError(error)

    expect(serialized).toEqual({
      type: 'object',
      message: '{"foo":"bar"}',
    })
  })

  it('should handle circular references gracefully', () => {
    const error: any = { foo: 'bar' }
    error.self = error // Circular reference

    const serialized = serializeError(error)

    expect(serialized).toEqual({
      type: 'object',
      message: '[Unserializable] Unknown error',
    })
  })
})

describe('serializeErrorJson', () => {
  it('should include additional custom properties', () => {
    const error: any = new Error('custom error')
    error.code = 'ERR_CUSTOM'
    error.details = { reason: 'unknown' }

    const serialized = serializeErrorJson(error) as any

    expect(serialized).toMatchObject({
      type: 'error',
      message: 'custom error',
      code: 'ERR_CUSTOM',
      details: { reason: 'unknown' },
    })
  })

  it('should serialize nested cause when cause is an Error', () => {
    const cause = new Error('cause error')
    const error = new Error('parent error')
    error.cause = cause

    const serialized = serializeErrorJson(error) as any

    expect(serialized.cause).toMatchObject({
      type: 'error',
      message: 'cause error',
    })
  })

  it('should serialize nested cause when cause is not an Error', () => {
    const error = new Error('parent error')
    error.cause = 'string cause'

    const serialized = serializeErrorJson(error) as any

    expect(serialized.cause).toMatchObject({
      type: 'string',
      message: 'string cause',
    })
  })
})

describe('deserializeError', () => {
  it('should deserialize a standard Error object', () => {
    const errorJson = {
      type: 'error',
      name: 'TestError',
      message: 'test message',
      stack: 'stack trace',
    }

    const error = deserializeError(errorJson as any)

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('TestError')
    expect(error.message).toBe('test message')
    expect(error.stack).toBe('stack trace')
  })

  it('should deserialize custom properties', () => {
    const errorJson = {
      type: 'error',
      name: 'TestError',
      message: 'test message',
      code: 123,
      details: { reason: 'fail' },
    }

    const error = deserializeError(errorJson as any) as any

    expect(error.code).toBe(123)
    expect(error.details).toEqual({ reason: 'fail' })
  })

  it('should deserialize nested cause', () => {
    const errorJson = {
      type: 'error',
      name: 'ParentError',
      message: 'parent',
      cause: {
        type: 'error',
        name: 'CauseError',
        message: 'cause',
      },
    }

    const error = deserializeError(errorJson as any)

    expect(error.cause).toBeInstanceOf(Error)
    expect((error.cause as Error).name).toBe('CauseError')
    expect((error.cause as Error).message).toBe('cause')
  })

  it('should wrap serialized string error in Error object', () => {
    const json = {
      type: 'string',
      message: 'plain error string',
    }
    const error = deserializeError(json as any)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('plain error string')
  })

  it('should verify round-trip serialization/deserialization', () => {
    const original = new Error('original error')
    original.name = 'OriginalError'
    ;(original as any).code = 'ERR_ORIG'

    const serialized = serializeError(original)
    const deserialized = deserializeError(serialized) as any

    expect(deserialized).toBeInstanceOf(Error)
    expect(deserialized.name).toBe('OriginalError')
    expect(deserialized.message).toBe('original error')
    expect(deserialized.code).toBe('ERR_ORIG')
  })
})
