import type { paths } from '@danmaku-anywhere/bangumi-api/next'
import createClient from 'openapi-fetch'
import { environment } from '../../../../environments/environment'

export const bangumiNextClient = createClient<paths>({
  baseUrl: `${environment.apiRoot}/bangumi/next`,
})

bangumiNextClient.use({
  // biome-ignore lint/suspicious/noExplicitAny: don't care about types in this case
  onResponse: (res: any) => {
    if (!res.response.ok) {
      throw new Error(res.response.statusText)
    }
  },
})
