import { describe, expect, it } from 'vitest'
import { RpcException } from '@/common/rpc/types'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { describeSourceError } from './describeSourceError'
import { SourceError, type SourceProblem } from './SourceError'

/**
 * Source failures raised in the background reach the popup and the in-page
 * controller as plain errors wrapped by the RPC client. describeSourceError
 * still recognizes them there and returns a translated explanation instead of
 * the English log message. Any other error keeps its message. The i18n mock
 * returns keys, so assertions compare translation keys.
 */

function acrossRpc(error: Error): RpcException {
  return new RpcException(error.message, {
    cause: deserializeError(serializeError(error)),
  })
}

describe('describeSourceError', () => {
  it.each([
    ['sourceRemoved', 'anime.sourceRemovedTooltip'],
    ['noUrlParser', 'searchPage.parse.noSource'],
    ['episodesUnsupported', 'providers.error.episodesUnsupported'],
    ['sourceUnavailable', 'providers.error.sourceUnavailable'],
    ['searchUnsupported', 'providers.error.searchUnsupported'],
    ['danmakuUnsupported', 'providers.error.danmakuUnsupported'],
    ['seasonRefreshUnsupported', 'providers.error.seasonRefreshUnsupported'],
  ] satisfies [
    SourceProblem,
    string,
  ][])('translates a %s error after it crosses the RPC boundary', (problem, key) => {
    const error = acrossRpc(
      new SourceError(problem, 'raw background message', 'Bilibili')
    )

    expect(describeSourceError(error)).toBe(key)
  })

  it('keeps the message of an unrelated error', () => {
    const error = acrossRpc(new Error('network down'))

    expect(describeSourceError(error)).toBe('network down')
  })
})
