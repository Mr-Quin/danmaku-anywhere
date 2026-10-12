import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger, type LogEntry } from './Logger'

/**
 * createLogger writes to the console and hands a serialized entry to onLog.
 * Errors, including DOMException (which is not an Error subclass in jsdom),
 * reach the console as "Name: message" text so a viewer that stringifies each
 * argument stays readable, and land in the entry with their name and message.
 */

function setup(method: 'error' | 'warn' = 'error') {
  const consoleSpy = vi
    .spyOn(console, method)
    .mockImplementation(() => undefined)
  const entries: LogEntry[] = []
  const logger = createLogger('[Test]', {
    onLog: (entry) => entries.push(entry),
  })
  return { logger, consoleSpy, entries }
}

// Chrome's extension error view does not call toString on objects, so only
// arguments that are already strings are guaranteed to read well there.
function consoleLine(spy: ReturnType<typeof vi.spyOn>): string {
  const args: unknown[] = spy.mock.calls[0]
  expect(args.every((arg) => typeof arg === 'string')).toBe(true)
  return args.join(' ')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createLogger', () => {
  it('writes a DOMException to the console as its name and message', () => {
    const { logger, consoleSpy } = setup()
    logger.error(
      'request failed:',
      new DOMException('signal timed out', 'TimeoutError')
    )

    const line = consoleLine(consoleSpy)
    expect(line).toContain('[Test] request failed:')
    expect(line).toContain('TimeoutError: signal timed out')
  })

  it('stores a DOMException with its name and message', () => {
    const { logger, entries } = setup()
    logger.error(
      'request failed:',
      new DOMException('signal timed out', 'TimeoutError')
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].message).toContain('"name":"TimeoutError"')
    expect(entries[0].message).toContain('"message":"signal timed out"')
  })

  it('includes the cause chain in the console text', () => {
    const { logger, consoleSpy } = setup('warn')
    const cause = new DOMException('The user aborted a request.', 'AbortError')
    logger.warn('sync failed:', new Error('fetch failed', { cause }))

    const line = consoleLine(consoleSpy)
    expect(line).toContain('Error: fetch failed')
    expect(line).toContain('Caused by: AbortError: The user aborted a request.')
  })

  it('passes non-error values to the console untouched', () => {
    const { logger, consoleSpy } = setup()
    const detail = { status: 503 }
    logger.error('bad response', detail)

    expect(consoleSpy).toHaveBeenCalledWith('[Test]', 'bad response', detail)
  })
})
