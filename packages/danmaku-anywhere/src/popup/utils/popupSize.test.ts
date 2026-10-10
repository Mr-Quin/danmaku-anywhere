import { describe, expect, it } from 'vitest'
import {
  CONTENT_SIZED_POPUP_SIZE,
  DESKTOP_POPUP_SIZE,
  resolvePopupSize,
} from './popupSize'

describe('resolvePopupSize', () => {
  it('uses the fixed desktop box regardless of viewport', () => {
    const size = resolvePopupSize({
      isMobile: false,
      isDetached: false,
      viewportWidth: 25,
      viewportHeight: 25,
    })
    expect(size).toEqual(DESKTOP_POPUP_SIZE)
  })

  it('fills the viewport when detached', () => {
    const size = resolvePopupSize({
      isMobile: false,
      isDetached: true,
      viewportWidth: 1280,
      viewportHeight: 720,
    })
    expect(size).toEqual({ width: '100vw', height: '100vh' })
  })

  it('fills a phone sized viewport on mobile, portrait or landscape', () => {
    const portrait = resolvePopupSize({
      isMobile: true,
      isDetached: false,
      viewportWidth: 360,
      viewportHeight: 640,
    })
    const landscape = resolvePopupSize({
      isMobile: true,
      isDetached: false,
      viewportWidth: 800,
      viewportHeight: 360,
    })
    expect(portrait).toEqual({ width: '100vw', height: '100vh' })
    expect(landscape).toEqual({ width: '100vw', height: '100vh' })
  })

  it('falls back to a fixed box when a mobile host starts collapsed', () => {
    const size = resolvePopupSize({
      isMobile: true,
      isDetached: false,
      viewportWidth: 25,
      viewportHeight: 25,
    })
    expect(size).toEqual(CONTENT_SIZED_POPUP_SIZE)
  })
})
