import { vi } from 'vitest'

export const mockFetchResponse = (data?: any, status?: number) => {
  const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(data),
    arrayBuffer: vi.fn().mockResolvedValue(data),
    status: status || 200,
    headers: new Map(),
  } as any)

  return mockFetch
}

export function mockFetch(res: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
}

export const createFetchOverride = () => {
  const originalFetch = globalThis.fetch

  return (headers: Record<string, string>) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args) => {
        const url = args[0]
        const init = args[1] || {}

        init.headers = {
          ...init.headers,
          ...headers,
        }

        return originalFetch(url, init)
      })
    )
  }
}
