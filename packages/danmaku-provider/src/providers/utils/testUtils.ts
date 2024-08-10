import { vi } from 'vitest'

export const mockFetchResponse = (data: any) => {
  const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(data),
  } as any)

  return mockFetch
}
