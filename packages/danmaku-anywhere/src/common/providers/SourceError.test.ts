import { describe, expect, it } from 'vitest'
import { RpcException } from '@/common/rpc/types'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { isUnreachableError } from './SourceError'

/**
 * isUnreachableError tells network failures and server errors apart from
 * other errors, including when they arrive wrapped by the RPC layer. A client
 * error such as 403 or 404 is not "unreachable".
 */

function overRpc(error: Error): RpcException {
  return new RpcException(error.message, {
    cause: deserializeError(serializeError(error)),
  })
}

describe('isUnreachableError', () => {
  it('matches an HTTP status failure from a manifest source', () => {
    expect(
      isUnreachableError(
        overRpc(new Error('HTTP 500 for https://proxy.example/search?k=a'))
      )
    ).toBe(true)
  })

  it('matches a network failure', () => {
    expect(isUnreachableError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('matches a provider HttpException by name through the cause chain', () => {
    const inner = new Error('upstream said no')
    inner.name = 'HttpException'
    const outer = new RpcException('Search failed', { cause: inner })
    expect(isUnreachableError(outer)).toBe(true)
  })

  it.each([
    'Request failed with status 401: Unauthorized',
    'Request failed with status 404: Not Found',
    'HTTP 429 for https://proxy.example/search?k=a',
  ])('does not treat a client error as unreachable: %s', (message) => {
    expect(isUnreachableError(overRpc(new Error(message)))).toBe(false)
  })

  it('reads the status of a provider HttpException', () => {
    const forbidden = Object.assign(new Error('upstream said no'), {
      name: 'HttpException',
      status: 403,
    })
    const unavailable = Object.assign(new Error('upstream down'), {
      name: 'HttpException',
      status: 503,
    })
    expect(isUnreachableError(forbidden)).toBe(false)
    expect(isUnreachableError(unavailable)).toBe(true)
  })

  it('treats a fetch that never got a response as unreachable', () => {
    const aborted = Object.assign(
      new Error('signal is aborted without reason'),
      {
        name: 'HttpException',
        status: 0,
      }
    )
    expect(isUnreachableError(aborted)).toBe(true)
  })

  it('does not match other failures', () => {
    expect(isUnreachableError(new Error('No danmaku found for Frieren'))).toBe(
      false
    )
    expect(isUnreachableError('HTTP 500')).toBe(false)
    expect(isUnreachableError(undefined)).toBe(false)
  })
})
