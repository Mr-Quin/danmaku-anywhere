import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runWithDnr } from './runWithDnr'
import type { SessionRuleHandle } from './sessionRules'
import { setSessionHeader } from './setSessionHeader'

vi.mock('./setSessionHeader', () => ({
  setSessionHeader: vi.fn(),
}))

function makeHandle(
  dispose: () => Promise<void> = async () => {}
): SessionRuleHandle {
  return {
    ruleId: 1,
    removeRule: vi.fn(),
    [Symbol.asyncDispose]: dispose,
  }
}

const OPTIONS = { restrictInitiatorDomain: true }

describe('runWithDnr', () => {
  const mockSetSessionHeader = vi.mocked(setSessionHeader)

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSessionHeader.mockResolvedValue(makeHandle())
  })

  it('should call setSessionHeader with resolved headers and execute action', async () => {
    const spec = {
      matchUrl: 'https://example.com/*',
      template: {
        Referer: 'https://referrer.com?q={query}',
      },
    }
    const context = { query: 'test' }
    const action = vi.fn().mockResolvedValue('result')

    const runner = runWithDnr(spec, OPTIONS, context)
    const result = await runner(action)

    expect(result).toBe('result')
    expect(mockSetSessionHeader).toHaveBeenCalledWith(
      'https://example.com/*',
      { Referer: 'https://referrer.com?q=test' },
      OPTIONS
    )
    expect(action).toHaveBeenCalled()
  })

  it('should dispose session header after action', async () => {
    const disposeMock = vi.fn()
    mockSetSessionHeader.mockResolvedValue(makeHandle(disposeMock))

    const spec = {
      matchUrl: 'url',
      template: {},
    }
    const action = vi.fn().mockResolvedValue('result')

    const runner = runWithDnr(spec, OPTIONS)
    await runner(action)

    // Verify dispose is called.
    // Since we use 'await using', it should be called after action finishes.
    expect(disposeMock).toHaveBeenCalled()
  })

  it('should handle action errors and still dispose', async () => {
    const disposeMock = vi.fn()
    mockSetSessionHeader.mockResolvedValue(makeHandle(disposeMock))

    const spec = {
      matchUrl: 'url',
      template: {},
    }
    const action = vi.fn().mockRejectedValue(new Error('Action failed'))

    const runner = runWithDnr(spec, OPTIONS)
    await expect(runner(action)).rejects.toThrow('Action failed')

    expect(disposeMock).toHaveBeenCalled()
  })
})
