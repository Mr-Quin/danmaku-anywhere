export const createTestUrl = (path: string) => {
  const baseUrl = 'http://example.com/'
  return `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}`
}
