import { DA_EXT_SOURCE_APP } from '@danmaku-anywhere/web-scraper'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The app bridge content script runs on every app URL, so a page that holds a
 * handle to an app window could otherwise post commands straight into it.
 * These tests drive the real window listener and assert it only acts on
 * messages this window posted to itself from an allowed app origin.
 */

const kazumiSearchContent = vi.fn(async () => ({ data: [] }))

vi.mock('@/common/ioc/uiIoc', () => {
  return {
    uiContainer: {
      get: () => {
        return { get: async () => ({ id: 'test-id' }) }
      },
    },
  }
})

vi.mock('@/common/options/extensionOptions/service', () => {
  return { ExtensionOptionsService: class {} }
})

vi.mock('@/common/rpcClient/background/client', () => {
  return { chromeRpcClient: { kazumiSearchContent } }
})

function createRequest() {
  return {
    source: DA_EXT_SOURCE_APP,
    type: 'request',
    action: 'kazumiSearch',
    id: 'kazumiSearch-1',
    data: { keyword: 'test', policy: {} },
  }
}

function post(origin: string, source: MessageEventSource | null) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: createRequest(),
      origin,
      source,
    })
  )
  return new Promise((resolve) => setTimeout(resolve, 0))
}

let otherWindow: MessageEventSource

beforeAll(async () => {
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  otherWindow = frame.contentWindow as MessageEventSource

  await import('./index')
})

beforeEach(() => {
  kazumiSearchContent.mockClear()
})

describe('app bridge message listener', () => {
  it('handles a request the app posted to its own window', async () => {
    await post('https://danmaku.weeblify.app', window)

    expect(kazumiSearchContent).toHaveBeenCalledTimes(1)
  })

  it('handles a request from the local dev app origin', async () => {
    await post('http://localhost:4200', window)

    expect(kazumiSearchContent).toHaveBeenCalledTimes(1)
  })

  it('handles a request from a staging subdomain', async () => {
    await post('https://danmaku-anywhere.quinfish.workers.dev', window)

    expect(kazumiSearchContent).toHaveBeenCalledTimes(1)
  })

  it('ignores a request from another window on an allowed origin', async () => {
    await post('https://danmaku.weeblify.app', otherWindow)

    expect(kazumiSearchContent).not.toHaveBeenCalled()
  })

  it.each([
    'https://evil.com',
    'https://danmaku.weeblify.app.evil.com',
    'https://evil.danmaku.weeblify.app',
    'https://evil-quinfish.workers.dev',
    'https://quinfish.workers.dev.evil.com',
    'http://danmaku.weeblify.app',
    'http://localhost:4201',
    'null',
  ])('ignores a request claiming to be the app from %s', async (origin) => {
    await post(origin, window)

    expect(kazumiSearchContent).not.toHaveBeenCalled()
  })
})
