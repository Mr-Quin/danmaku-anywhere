export function isDetachedWindow(): boolean {
  return new URLSearchParams(window.location.search).get('detached') === '1'
}
