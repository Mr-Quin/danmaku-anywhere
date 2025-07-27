import type { paths } from '@danmaku-anywhere/bangumi-api/next'
import createClient from 'openapi-fetch'

export const bangumiNextClient = createClient<paths>({
  baseUrl: 'https://next.bgm.tv/',
})

bangumiNextClient.use({
  // biome-ignore lint/suspicious/noExplicitAny: don't care about types in this case
  onResponse: (res: any) => {
    if (!res.response.ok) {
      throw new Error(res.response.statusText)
    }
  },
})
