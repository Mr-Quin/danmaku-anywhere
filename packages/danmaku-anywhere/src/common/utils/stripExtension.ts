const stripExtensionRegex = /\.[^.]+$/

// remove the last extension from the filename
export const stripExtension = (filename: string) => {
  return filename.replace(stripExtensionRegex, '')
}
