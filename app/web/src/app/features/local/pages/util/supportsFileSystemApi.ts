export function supportsFileSystemApi(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}
