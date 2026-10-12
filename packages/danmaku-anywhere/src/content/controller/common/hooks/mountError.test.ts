import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/common/localization/i18n'
import { DanmakuMountError, describeMountError } from './mountError'

/**
 * A failed mount in the in-page controller shows a translated toast instead of
 * the English message the error carries for the log, with a translated reason
 * per failure. The i18n mock returns keys, so the assertions compare
 * translation keys.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

describe('describeMountError', () => {
  it.each([
    ['noActiveFrame', 'integration.steps.checkVideoFail'],
    ['mountFailed', 'error.unknown'],
  ] as const)('translates a %s error with its reason', (problem, reasonKey) => {
    const t = vi.spyOn(i18n, 't')

    const message = describeMountError(
      new DanmakuMountError(problem, 'raw message')
    )

    expect(message).toBe('danmaku.alert.mountError')
    expect(t.mock.calls.map(([key]) => key)).toContain(reasonKey)
  })

  it('keeps the message of an unrelated error', () => {
    expect(describeMountError(new Error('boom'))).toBe('boom')
  })
})
