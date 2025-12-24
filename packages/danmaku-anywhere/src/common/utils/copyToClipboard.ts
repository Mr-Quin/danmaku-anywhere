export function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text)
}
