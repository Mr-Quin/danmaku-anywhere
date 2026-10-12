import { describe, expect, it } from 'vitest'
import { RpcException } from '@/common/rpc/types'
import { isNetworkError } from './networkError'

/**
 * isNetworkError recognises the unreachable-host rejection of each browser's
 * fetch, including after the RPC layer rewraps it, and nothing else, so other
 * failures keep their own message.
 */

describe('isNetworkError', () => {
  it('matches the fetch rejection of each browser', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(
      isNetworkError(
        new TypeError('NetworkError when attempting to fetch resource.')
      )
    ).toBe(true)
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true)
    expect(isNetworkError(new RpcException('Failed to fetch'))).toBe(true)
  })

  it('leaves other errors alone', () => {
    expect(isNetworkError(new Error('HTTP 500'))).toBe(false)
    expect(
      isNetworkError(new Error('Failed to fetch the manifest catalog'))
    ).toBe(false)
    expect(isNetworkError('Failed to fetch')).toBe(false)
  })
})
