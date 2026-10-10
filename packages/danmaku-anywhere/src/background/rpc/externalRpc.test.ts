import { describe, expect, it, vi } from 'vitest'
import {
  EXTERNAL_RPC_ALLOWLIST,
  gateExternalHandlers,
} from '@/background/rpc/externalRpc'
import type { RPCServerHandlers } from '@/common/rpc/server'
import type { RPCDef } from '@/common/rpc/types'

/**
 * Pins the set of background RPC commands a website can reach through
 * onMessageExternal, and checks that the gate replaces every other command with
 * an explicit rejection. A command added to the RPC server is denied until it is
 * added to the allowlist, which also fails the pinned list below.
 */

type TestMethods = {
  allowed: RPCDef<void, string>
  denied: RPCDef<void, string>
}

const sender = {} as chrome.runtime.MessageSender
const setContext = vi.fn()

function createHandlers(): RPCServerHandlers<TestMethods> {
  return {
    allowed: async () => 'allowed result',
    denied: async () => 'denied result',
  }
}

describe('EXTERNAL_RPC_ALLOWLIST', () => {
  it('admits only the mount config commands the onboarding flow uses', () => {
    expect([...EXTERNAL_RPC_ALLOWLIST]).toEqual([
      'mountConfigGetAll',
      'mountConfigCreate',
    ])
  })
})

describe('gateExternalHandlers', () => {
  it('passes an allowlisted command through to the real handler', async () => {
    const gated = gateExternalHandlers(createHandlers(), ['allowed'])

    await expect(gated.allowed(undefined, sender, setContext)).resolves.toBe(
      'allowed result'
    )
  })

  it('rejects a command that is not on the allowlist', async () => {
    const gated = gateExternalHandlers(createHandlers(), ['allowed'])

    await expect(gated.denied(undefined, sender, setContext)).rejects.toThrow(
      'Method denied is not available to external callers'
    )
  })

  it('denies a newly added command that nobody remembered to allowlist', async () => {
    const handlers = {
      ...createHandlers(),
      addedLater: async () => 'added later result',
    } as RPCServerHandlers<TestMethods & { addedLater: RPCDef<void, string> }>

    const gated = gateExternalHandlers(handlers, ['allowed'])

    await expect(
      gated.addedLater(undefined, sender, setContext)
    ).rejects.toThrow('Method addedLater is not available to external callers')
  })
})
