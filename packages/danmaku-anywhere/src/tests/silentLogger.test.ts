import { describe, expect, test } from 'vitest'
import { silentLogger } from './silentLogger'

/**
 * Verifies the shared test logger has the same fluent shape as production logging.
 * It must be safe to pass to services without emitting test output.
 */
describe('silentLogger', () => {
  test('returns itself when creating a sub-logger', () => {
    expect(silentLogger.sub('[provider]')).toBe(silentLogger)
  })

  test('accepts the console methods used by services', () => {
    expect(() => {
      silentLogger.debug('debug')
      silentLogger.info('info')
      silentLogger.warn('warn')
      silentLogger.error('error')
      silentLogger.log('log')
    }).not.toThrow()
  })
})
