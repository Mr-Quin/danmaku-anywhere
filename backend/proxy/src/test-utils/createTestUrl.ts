export const createTestUrl = (
  path: string,
  {
    query,
  }: {
    query?: Record<string, string>
  } = {}
) => {
  const baseUrl = 'http://example.com/'
  const url = `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}`
  if (query) {
    const searchParams = new URLSearchParams(query)
    return `${url}?${searchParams.toString()}`
  }
  return url
}
