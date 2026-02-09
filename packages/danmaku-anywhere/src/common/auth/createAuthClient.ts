import { createAuthClient } from 'better-auth/client'
import { getAuthBaseUrl } from './getAuthBaseUrl'

type TokenStore = {
  getTokenSync: () => string
  setToken: (token: string | null) => Promise<void>
}

export const createAuthClientInstance = (tokenStore: TokenStore) => {
  return createAuthClient({
    baseURL: getAuthBaseUrl(),
    fetchOptions: {
      auth: {
        type: 'Bearer',
        token: () => tokenStore.getTokenSync(),
      },
      onSuccess: (ctx) => {
        const authToken = ctx.response.headers.get('set-auth-token')
        if (authToken) {
          void tokenStore.setToken(authToken)
        }
      },
    },
  })
}
