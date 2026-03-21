import { vi } from 'vitest'

vi.mock('@/common/Logger', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  const noopLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    sub: () => noopLogger,
  }
  return {
    ...original,
    Logger: noopLogger,
    createLogger: () => noopLogger,
  }
})
