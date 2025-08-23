export function supportsFilesystemApi(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}
