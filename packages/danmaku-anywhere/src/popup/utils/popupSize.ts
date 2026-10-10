export interface PopupSize {
  width: number | string
  height: number | string
}

export const DESKTOP_POPUP_SIZE: PopupSize = { width: 500, height: 600 }
export const CONTENT_SIZED_POPUP_SIZE: PopupSize = { width: 360, height: 600 }

// A browser that opens the popup as a tab hands it a screen-sized viewport.
// One that sizes the popup bubble to its content starts far smaller than any
// screen, and viewport units would keep it there.
const COLLAPSED_VIEWPORT_LIMIT_PX = 300

export interface PopupSizeInput {
  isMobile: boolean
  isDetached: boolean
  viewportWidth: number
  viewportHeight: number
}

export function resolvePopupSize(input: PopupSizeInput): PopupSize {
  const collapsed =
    input.viewportWidth < COLLAPSED_VIEWPORT_LIMIT_PX ||
    input.viewportHeight < COLLAPSED_VIEWPORT_LIMIT_PX
  if (input.isMobile && collapsed) {
    return CONTENT_SIZED_POPUP_SIZE
  }
  if (input.isMobile || input.isDetached) {
    return { width: '100vw', height: '100vh' }
  }
  return DESKTOP_POPUP_SIZE
}
