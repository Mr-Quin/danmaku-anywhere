// When video becomes full screen, the popover (content script) will be visible on top of the video,
// but will become "inert" and non-interactive.
// To maintain interactivity, we need to re-parent the popover into the fullscreen element.
// https://github.com/whatwg/html/issues/10811
export function reparentPopover(
  popover: HTMLDivElement,
  document: Document,
  target: Element | null
) {
  if (!target) {
    // if no target, reparent to body and show the popover
    if (popover.parentElement !== document.body) {
      document.body.appendChild(popover)
    }
    popover.hidePopover()
    popover.showPopover()
    return
  }

  if (
    target instanceof HTMLVideoElement ||
    target instanceof HTMLIFrameElement
  ) {
    // Cannot reparent to these elements, hide and show so the popover will be visible on top of the video
    popover.hidePopover()
    popover.showPopover()
  } else {
    // reparent to target and show the popover
    if (popover.parentElement !== target) {
      target.appendChild(popover)
    }
    popover.hidePopover()
    popover.showPopover()
  }
}
