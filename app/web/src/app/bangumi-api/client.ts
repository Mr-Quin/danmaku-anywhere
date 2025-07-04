import createClient from 'openapi-fetch'
import type { paths } from './schema'
import type { paths as nextPaths } from './schema-next'

export const bangumiClient = createClient<paths>({
  baseUrl: 'https://api.bgm.tv/',
})

export const bangumiNextClient = createClient<nextPaths>({
  baseUrl: 'https://next.bgm.tv/',
})

bangumiNextClient.use({
  onResponse: (res) => {
    if (!res.response.ok) {
      throw new Error(res.response.statusText)
    }
  }
})