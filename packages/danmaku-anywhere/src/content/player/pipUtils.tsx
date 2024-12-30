const copyStyles = (pipWindow: Window) => {
  // Copy all style sheets.
  const styleSheets = [...document.styleSheets]

  styleSheets.forEach((styleSheet) => {
    try {
      const cssRules = [...styleSheet.cssRules]
        .map((rule) => rule.cssText)
        .join('')
      const style = document.createElement('style')

      style.textContent = cssRules
      pipWindow.document.head.appendChild(style)
    } catch {
      const link = document.createElement('link')

      link.rel = 'stylesheet'
      link.type = styleSheet.type
      link.media = styleSheet.media.toString()
      if (styleSheet.href) {
        link.href = styleSheet.href
      }
      pipWindow.document.head.appendChild(link)
    }
  })
}

// https://developer.chrome.com/docs/web-platform/document-picture-in-picture/
export const createPipWindow = async () => {
  const documentPictureInPicture = window.documentPictureInPicture

  if (!documentPictureInPicture) {
    throw new Error('Picture-in-Picture is not supported')
  }

  // Close the PIP window if it is already open.
  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.close()
  }

  const pipWindow = await documentPictureInPicture.requestWindow()

  copyStyles(pipWindow)

  return pipWindow
}

export const moveElement = (element: HTMLElement, root: HTMLElement) => {
  const parent = element.parentElement
  root.appendChild(element)

  return () => {
    if (!parent) element.remove()
    parent?.appendChild(element)
  }
}
