import { vi } from 'vitest'

export const mockFetchResponse = (data?: any, status?: number) => {
  const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(data),
    arrayBuffer: vi.fn().mockResolvedValue(data),
    status: status || 200,
  } as any)

  return mockFetch
}
