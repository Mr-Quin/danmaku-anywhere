import shadowCss from './shadow.css?inline'

type PopoverRootOptions = {
  id: string
}

// create shadow dom for extension ui
export const createPopoverRoot = ({ id }: PopoverRootOptions) => {
  const root = document.createElement('div')
  root.id = id
  root.classList.add('root')
  root.setAttribute(
    'style',
    'position: absolute !important; z-index: 2147483647 !important; left: 0 !important; top: 0 !important; pointer-events: auto !important;'
  )

  // make the root element a popover so it can be shown on top of everything
  root.setAttribute('popover', 'manual')

  const shadowContainer = root.attachShadow({ mode: 'closed' })
  const shadowRoot = document.createElement('div')

  shadowContainer.appendChild(shadowRoot)

  document.body.append(root)
  root.showPopover()

  const shadowStyle = document.createElement('style')
  shadowContainer.appendChild(shadowStyle)

  // prevent global styles from leaking into shadow dom
  // TODO: rem unit is still affected by html { font-size }
  shadowStyle.innerHTML = shadowCss

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
