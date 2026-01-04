import { describe, expect, it } from 'vitest'
import { serializeError, serializeErrorJson } from './serializeError'

describe('serializeError', () => {
  it('should serialize a standard Error object', () => {
    const error = new Error('test message')
    error.name = 'TestError'

    // Manually setting stack for deterministic testing if needed,
    // but usually existence check is enough.
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
    error.cause = 'string cause' // TS says cause is unknown? Error interface has cause?: unknown in standard lib

    const serialized = serializeErrorJson(error) as any

    expect(serialized.cause).toBe('string cause')
  })
})
