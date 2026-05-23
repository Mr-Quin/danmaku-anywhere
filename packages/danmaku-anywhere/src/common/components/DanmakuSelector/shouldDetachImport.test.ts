import { describe, expect, it } from 'vitest'
import { type DetachContext, shouldDetachImport } from './useImportFlow'

/**
 * The detach decision exists so the OS file picker doesn't dismiss the
 * toolbar action popup on Wayland. Detach must fire for the desktop action
 * popup and skip everywhere else (controller, mobile, web-app build, the
 * detached window itself, and popup.html opened directly in a tab).
 */

const popup: DetachContext = {
  envType: 'popup',
  isMobile: false,
  isInTab: false,
  isStandaloneRuntime: false,
  isDetachedWindow: false,
}

describe('shouldDetachImport', () => {
  it('detaches for the desktop toolbar action popup', () => {
    expect(shouldDetachImport(popup)).toBe(true)
  })

  it.each<[string, Partial<DetachContext>]>([
    ['controller', { envType: 'controller' }],
    ['mobile', { isMobile: true }],
    ['popup opened directly in a tab', { isInTab: true }],
    ['standalone web-app build', { isStandaloneRuntime: true }],
    ['the detached window itself', { isDetachedWindow: true }],
  ])('skips detach when %s', (_, override) => {
    expect(shouldDetachImport({ ...popup, ...override })).toBe(false)
  })
})
