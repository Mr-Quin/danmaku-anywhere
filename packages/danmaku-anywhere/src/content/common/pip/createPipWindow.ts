type PipWindowOptions = {
  width?: number
  height?: number
}

/**
 * Create a Document Picture-in-Picture window.
 * Only available in the top-level browsing context (not iframes).
 */
export const createPipWindow = async (options?: PipWindowOptions) => {
  const documentPictureInPicture = window.documentPictureInPicture

  if (!documentPictureInPicture) {
    throw new Error('Picture-in-Picture is not supported')
  }

  // Close the PiP window if it is already open.
  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.close()
  }

  const pipWindow = await documentPictureInPicture.requestWindow(options)

  return pipWindow
}
