import { vi } from 'vitest'

export const mockFetchResponse = (data?: any, status?: number) => {
  const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(data),
    arrayBuffer: vi.fn().mockResolvedValue(data),
    status: status || 200,
    headers: new Map(),
  } as any)

  return mockFetch
}

export const createFetchOverride = () => {
  const originalFetch = global.fetch

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
