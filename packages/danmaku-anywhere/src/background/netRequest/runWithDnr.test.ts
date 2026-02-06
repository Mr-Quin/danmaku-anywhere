import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runWithDnr } from './runWithDnr'
import { setSessionHeader } from './setSessionHeader'

vi.mock('./setSessionHeader', () => ({
  setSessionHeader: vi.fn(),
}))

describe('runWithDnr', () => {
  const mockSetSessionHeader = setSessionHeader as unknown as ReturnType<
    typeof vi.fn
  >

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSessionHeader.mockResolvedValue({
      async [Symbol.asyncDispose]() {},
    })
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

    const runner = runWithDnr(spec, context)
    const result = await runner(action)

    expect(result).toBe('result')
    expect(mockSetSessionHeader).toHaveBeenCalledWith('https://example.com/*', {
      Referer: 'https://referrer.com?q=test',
    })
    expect(action).toHaveBeenCalled()
  })

  it('should dispose session header after action', async () => {
    const disposeMock = vi.fn()
    mockSetSessionHeader.mockResolvedValue({
      [Symbol.asyncDispose]: disposeMock,
    })

    const spec = {
      matchUrl: 'url',
      template: {},
    }
    const action = vi.fn().mockResolvedValue('result')

    const runner = runWithDnr(spec, {})
    await runner(action)

    // Verify dispose is called.
    // Since we use 'await using', it should be called after action finishes.
    expect(disposeMock).toHaveBeenCalled()
  })

  it('should handle action errors and still dispose', async () => {
    const disposeMock = vi.fn()
    mockSetSessionHeader.mockResolvedValue({
      [Symbol.asyncDispose]: disposeMock,
    })

    const spec = {
      matchUrl: 'url',
      template: {},
    }
    const action = vi.fn().mockRejectedValue(new Error('Action failed'))

    const runner = runWithDnr(spec, {})
    await expect(runner(action)).rejects.toThrow('Action failed')

    expect(disposeMock).toHaveBeenCalled()
  })
})
