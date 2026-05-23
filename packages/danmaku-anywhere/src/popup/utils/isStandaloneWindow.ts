export function isStandaloneWindow(): boolean {
  return new URLSearchParams(window.location.search).get('standalone') === '1'
}
