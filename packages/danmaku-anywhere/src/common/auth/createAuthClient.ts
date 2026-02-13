import { createAuthClient } from 'better-auth/client'
import { jwtClient } from 'better-auth/client/plugins'
import { getAuthBaseUrl } from './getAuthBaseUrl'

type TokenStore = {
  getTokenSync: () => string
  setToken: (token: string | null) => Promise<void>
}

export function createAuthClientInstance(tokenStore: TokenStore) {
  return createAuthClient({
    baseURL: getAuthBaseUrl(),
    plugins: [jwtClient()],
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
