import { describe, expect, it, vi } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { silentLogger } from '@/tests/silentLogger'
import { createChromeRpcClient } from './client'
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

describe('RPC error round trip', () => {
  it('rehydrates an AppError with its code and params', async () => {
    const error = await callFail(async () => {
      throw new AppError('http', {
        status: 503,
        source: {
          providerConfigId: 'bili-2',
          manifestId: 'bilibili',
          name: 'Bilibili',
        },
      })
    })

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'http',
      params: {
        status: 503,
        source: {
          providerConfigId: 'bili-2',
          manifestId: 'bilibili',
          name: 'Bilibili',
        },
      },
    })
  })

  it('keeps the cause chain, rehydrating a nested AppError too', async () => {
    const error = await callFail(async () => {
      const network = new AppError(
        'network',
        {
          source: {
            providerConfigId: 'tencent',
            manifestId: 'tencent',
            name: 'Tencent',
          },
        },
        { cause: new TypeError('Failed to fetch') }
      )
      throw new AppError('catalog.unreachable', {}, { cause: network })
    })

    expect(error).toBeInstanceOf(AppError)
    const outer = error as AppError
    expect(outer.code).toBe('catalog.unreachable')
    expect(outer.cause).toBeInstanceOf(AppError)
    const inner = outer.cause as AppError
    expect(inner.code).toBe('network')
    expect(inner.params).toEqual({
      source: {
        providerConfigId: 'tencent',
        manifestId: 'tencent',
        name: 'Tencent',
      },
    })
    expect(inner.cause).toBeInstanceOf(Error)
    expect((inner.cause as Error).message).toBe('Failed to fetch')
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

  it('codes a delivery failure as rpc.unreachable and keeps the cause', async () => {
    const delivery = new Error('Could not establish connection')
    vi.spyOn(chrome.runtime, 'sendMessage').mockRejectedValue(delivery)

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('rpc.unreachable')
    expect((error as AppError).cause).toBe(delivery)
  })

  it('codes a missing response as rpc.unreachable', async () => {
    vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue(undefined)

    const error = await createChromeRpcClient<Records>()
      .fail()
      .catch((e: unknown) => e)

    expect((error as AppError).code).toBe('rpc.unreachable')
  })
})
