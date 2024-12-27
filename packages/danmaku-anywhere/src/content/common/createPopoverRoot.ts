// create shadow dom for extension ui
export const createPopoverRoot = (id: string) => {
  const root = document.createElement('div')
  root.id = id
  root.style.setProperty('position', 'absolute', 'important')
  root.style.setProperty('z-index', '2147483647', 'important')
  root.style.setProperty('left', '0', 'important')
  root.style.setProperty('top', '0', 'important')

  // make the root element a popover so it can be shown on top of everything
  root.setAttribute('popover', 'manual')

  const shadowContainer = root.attachShadow({ mode: 'closed' })
  const shadowRoot = document.createElement('div')

  shadowContainer.appendChild(shadowRoot)

  document.body.append(root)
  root.showPopover()

  // Listen to fullscreenchange event to keep the popover on top
  document.addEventListener('fullscreenchange', () => {
    /**
     * The last element in the top layer is shown on top.
     * Hiding then showing the popover will make it the last element in the top layer.
     *
     * Do this every time something goes fullscreen, to ensure the popover is always on top.
     */
    root.hidePopover()
    root.showPopover()
  })

  const shadowStyle = document.createElement('style')
  shadowContainer.appendChild(shadowStyle)

  // prevent global styles from leaking into shadow dom
  // TODO: rem unit is still affected by html { font-size }
  shadowStyle.textContent = `
  :host {
  all : initial;
  }
  `

  return {
    // root element in the real dom
    root,
    // shadow dom container attached to the root element
    shadowContainer,
    // root element in the shadow dom
    shadowRoot,
    // style element in the shadowContainer
    shadowStyle,
  }
}
