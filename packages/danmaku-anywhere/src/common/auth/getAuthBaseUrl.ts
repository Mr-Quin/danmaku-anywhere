const authBasePath = '/auth'

export const getAuthBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_PROXY_URL
  if (!baseUrl) {
    throw new Error('VITE_PROXY_URL is not configured')
  }
  return new URL(authBasePath, baseUrl).toString()
}
