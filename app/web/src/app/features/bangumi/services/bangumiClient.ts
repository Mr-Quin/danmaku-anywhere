import type { paths } from '@danmaku-anywhere/bangumi-api'
import createClient from 'openapi-fetch'

export const bangumiClient = createClient<paths>({
  baseUrl: 'https://api.bgm.tv/',
})

bangumiClient.use({
  // biome-ignore lint/suspicious/noExplicitAny: don't care about types in this case
  onResponse: (res: any) => {
    if (!res.response.ok) {
      throw new Error(res.response.statusText)
    }
  },
})
