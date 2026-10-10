import { describe, expect, it } from 'vitest'
import { getExternallyConnectablePatterns } from '@/common/appUrls'

/**
 * The externally_connectable patterns are what the browser uses to decide which
 * websites may talk to the background RPC server. A plaintext http entry in a
 * shipped build hands that channel to anyone on the network path, so a released
 * build must only list https origins.
 */

describe('getExternallyConnectablePatterns', () => {
  it('ships https origins only', () => {
    expect(getExternallyConnectablePatterns(false)).toEqual([
      'https://danmaku.weeblify.app/*',
    ])
  })

  it('only adds a loopback origin in dev builds', () => {
    const devOnly = getExternallyConnectablePatterns(true).filter((pattern) => {
      return !getExternallyConnectablePatterns(false).includes(pattern)
    })

    expect(devOnly).toEqual(['http://localhost:4321/*'])
  })
})
