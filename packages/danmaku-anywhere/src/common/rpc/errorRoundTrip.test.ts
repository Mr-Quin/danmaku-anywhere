import { describe, expect, it, vi } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { silentLogger } from '@/tests/silentLogger'
import { createChromeRpcClient, createContentRpcClient } from './client'
import { createRpcServer } from './server'
import type { RPCDef, RPCPayload } from './types'

type Records = {
  fail: RPCDef<void, string>
}

type Listener = (
  message: RPCPayload<unknown>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | undefined

// Routes the client's sendMessage through the real server listener, so the
// error goes through the same serialize and rehydrate path as in the browser.
function connect(handler: () => Promise<string>) {
  let listener: Listener | undefined
  const event = {
    addListener: (fn: Listener) => {
      listener = fn
    },
  } as unknown as typeof chrome.runtime.onMessage // lint-specs-allow-cast: listen() only calls addListener
  createRpcServer<Records>({ fail: handler }, { logger: silentLogger }).listen(
    event
  )

  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
    payload: RPCPayload<unknown>
  ) => {
    return new Promise((resolve) => {
      listener?.(payload, {}, resolve)
    })
  }) as never)

  return createChromeRpcClient<Records>()
}

async function callFail(handler: () => Promise<string>): Promise<unknown> {
  const client = connect(handler)
  return client.fail().then(
    () => {
      throw new Error('expected the call to fail')
    },
    (error: unknown) => error
  )
}

const BILIBILI = {
  kind: 'source',
  ref: { providerConfigId: 'bili-2', manifestId: 'bilibili', name: 'Bilibili' },
} as const

describe('RPC error round trip', () => {
  it('rehydrates an AppError with its code and params', async () => {
    const error = await callFail(async () => {
      throw new AppError('http', { status: 503, target: BILIBILI })
    })

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'http',
      params: { status: 503, target: BILIBILI },
    })
  })

  it('keeps the engine error and the platform rejection behind it', async () => {
    const error = await callFail(async () => {
      const rejection = new TypeError('Failed to fetch')
      const engineError = Object.assign(
        new Error('network request failed for https://api.bilibili.com/x', {
          cause: rejection,
        }),
        { name: 'NetworkError', url: 'https://api.bilibili.com/x' }
      )
      throw new AppError(
        'network',
        { target: BILIBILI },
        { cause: engineError }
      )
    })

    expect(error).toBeInstanceOf(AppError)
    const appError = error as AppError
    expect(appError.code).toBe('network')
    expect(appError.params).toEqual({ target: BILIBILI })
    const engine = appError.cause as Error
    expect(engine.name).toBe('NetworkError')
    expect(engine).toMatchObject({ url: 'https://api.bilibili.com/x' })
    const platform = engine.cause as Error
    expect(platform.name).toBe('TypeError')
    expect(platform.message).toBe('Failed to fetch')
  })

  it('does not turn an unclassified error into an AppError', async () => {
    const error = await callFail(async () => {
      throw new Error('boom')
    })

    expect(error).not.toBeInstanceOf(AppError)
    expect((error as Error).message).toBe('boom')
  })

  it('does not rehydrate an error that only borrows an AppError code', async () => {
    const error = await callFail(async () => {
      throw Object.assign(new Error('engine failure'), { code: 'network' })
    })

    expect(error).not.toBeInstanceOf(AppError)
  })

  it.each([
    ['missing params', { code: 'source.episodesUnsupported', params: {} }],
    [
      'params of the wrong type',
      { code: 'catalog.applyFailed', params: { sources: 'bilibili' } },
    ],
    ['an unknown code', { code: 'unknown', params: {} }],
    [
      'a partial source',
      { code: 'hostNotAllowed', params: { source: { name: 'Bilibili' } } },
    ],
  ])('keeps an error with %s unclassified', async (_, parts) => {
    const error = await callFail(async () => {
      throw Object.assign(new Error('forged'), parts)
    })

    expect(error).not.toBeInstanceOf(AppError)
    expect((error as Error).message).toBe('forged')
  })
})

describe('RPC delivery failures', () => {
  function silenceWarnings() {
    return vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  }

  it('codes a rejected sendMessage as rpc.unreachable and logs the cause', async () => {
    const warn = silenceWarnings()
    const delivery = new Error('Could not establish connection')
    vi.spyOn(chrome.runtime, 'sendMessage').mockRejectedValue(delivery)

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('rpc.unreachable')
    expect((error as AppError).cause).toBe(delivery)
    expect(warn).toHaveBeenCalledWith(expect.any(String), delivery)
  })

  it('points the stack at the call site', async () => {
    silenceWarnings()
    vi.spyOn(chrome.runtime, 'sendMessage').mockRejectedValue(new Error('x'))

    async function callFromHere() {
      return createChromeRpcClient<Records>()
        .fail()
        .catch((e: unknown) => e)
    }
    const error = await callFromHere()

    expect((error as Error).stack).toContain('callFromHere')
  })

  it('codes a missing tab as rpc.unreachable', async () => {
    silenceWarnings()
    vi.spyOn(chrome.tabs, 'query').mockResolvedValue([] as never)

    const error = await createContentRpcClient<Records>()
      .fail(undefined, undefined, { tabInfo: { active: true } })
      .catch((e: unknown) => e)

    expect((error as AppError).code).toBe('rpc.unreachable')
  })

  it('codes a rejected tabs.sendMessage as rpc.unreachable', async () => {
    silenceWarnings()
    const delivery = new Error('Receiving end does not exist.')
    vi.spyOn(chrome.tabs, 'query').mockResolvedValue([{ id: 7 }] as never)
    vi.spyOn(chrome.tabs, 'sendMessage').mockRejectedValue(delivery)

    const error = await createContentRpcClient<Records>()
      .fail(undefined, undefined, { tabInfo: { active: true } })
      .catch((e: unknown) => e)

    expect((error as AppError).code).toBe('rpc.unreachable')
    expect((error as AppError).cause).toBe(delivery)
  })

  it('leaves a payload that cannot be cloned unclassified', async () => {
    const clone = new DOMException('could not be cloned', 'DataCloneError')
    vi.spyOn(chrome.runtime, 'sendMessage').mockRejectedValue(clone)

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(AppError)
  })

  it('leaves a missing response unclassified', async () => {
    vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue(
      undefined as never
    )

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(AppError)
    expect((error as Error).message).toContain('returned undefined')
  })

  it('leaves an ignored call unclassified', async () => {
    vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({
      state: 'ignored',
    } as never)

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(AppError)
  })
})
