import { describe, expect, it } from 'vitest'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { AppError, isRetryable } from './AppError'

/**
 * isRetryable tells a failure that trying again can fix from one it cannot,
 * after the error has crossed the RPC boundary. A link that names nothing, or
 * an episode a recognized link does not have, will not change on Retry; a
 * network failure might. An error from outside the error model counts as
 * retryable.
 */

const SOURCE = {
  providerConfigId: 'bilibili',
  manifestId: 'bilibili',
  name: 'Bilibili',
}

function acrossRpc(error: Error): unknown {
  return deserializeError(serializeError(error))
}

describe('isRetryable', () => {
  it('does not offer a retry for a link that names nothing or a missing episode', () => {
    expect(
      isRetryable(
        acrossRpc(new AppError('source.urlTitleNotFound', { source: SOURCE }))
      )
    ).toBe(false)
    expect(
      isRetryable(acrossRpc(new AppError('source.urlEpisodeNotFound')))
    ).toBe(false)
    expect(isRetryable(acrossRpc(new AppError('source.noUrlParser')))).toBe(
      false
    )
  })

  it('offers a retry for a transport failure and an unclassified error', () => {
    expect(
      isRetryable(
        acrossRpc(
          new AppError('http', {
            status: 500,
            target: { kind: 'source', ref: SOURCE },
          })
        )
      )
    ).toBe(true)
    expect(isRetryable(acrossRpc(new Error('boom')))).toBe(true)
  })
})
