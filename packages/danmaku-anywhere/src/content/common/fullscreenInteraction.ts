import { canHoldPopover } from './reparentPopover'

// The controller lives in a popover. Inside a fullscreen element it can only
// take clicks after being moved into that element, which is impossible for a
// <video> or <iframe> and skipped when the user turned the option off. In those
// cases the popover is still drawn on top, but clicks fall through to the page.
export function canInteractInFullscreen(
  fullscreenElement: Element | null,
  enableFullscreenInteraction: boolean
): boolean {
  if (!fullscreenElement) {
    return true
  }
  if (!enableFullscreenInteraction) {
    return false
  }
  return canHoldPopover(fullscreenElement)
}
