import { vi } from 'vitest'

interface RateLimitMockOptions {
  success?: boolean
}

export function createRateLimiterMock({
  success = true,
}: RateLimitMockOptions = {}) {
  return {
    limit: vi.fn(async () => ({ success })),
  }
}
