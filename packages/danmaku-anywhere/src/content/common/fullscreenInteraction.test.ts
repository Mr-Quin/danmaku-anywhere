import { describe, expect, it } from 'vitest'
import { canInteractInFullscreen } from './fullscreenInteraction'

/**
 * canInteractInFullscreen: the controller UI only takes clicks in fullscreen
 * when it can be moved into the fullscreen element, which rules out <video>
 * and <iframe> and requires the fullscreen interaction option.
 */

describe('canInteractInFullscreen', () => {
  it('allows interaction outside fullscreen', () => {
    expect(canInteractInFullscreen(null, false)).toBe(true)
  })

  it('allows interaction in a fullscreen container', () => {
    const container = document.createElement('div')
    expect(canInteractInFullscreen(container, true)).toBe(true)
  })

  it('blocks interaction when the option is off', () => {
    const container = document.createElement('div')
    expect(canInteractInFullscreen(container, false)).toBe(false)
  })

  it('blocks interaction in a fullscreen video or iframe', () => {
    expect(canInteractInFullscreen(document.createElement('video'), true)).toBe(
      false
    )
    expect(
      canInteractInFullscreen(document.createElement('iframe'), true)
    ).toBe(false)
  })
})
