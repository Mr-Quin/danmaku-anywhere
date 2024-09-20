interface DocumentPictureInPictureOptions {
  width: number
  height: number
}

declare global {
  interface Window {
    // Not available in all browsers
    readonly documentPictureInPicture?: {
      window: Window | null
      requestWindow: DocumentPictureInPictureOptions
    }
  }
}

export {}
