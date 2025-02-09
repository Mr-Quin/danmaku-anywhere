import { fetchData } from '../utils/fetchData.js'

import type { ExtractTitleResponse } from './schema.js'
import { zExtractTitleResponse } from './schema.js'

export const API_ROOT = 'https://danmaku.weeblify.app/proxy'

const store = {
  baseUrl: API_ROOT,
}

export const configure = (options: Partial<typeof store>) => {
  Object.assign(store, options)
}

export const extractTitle = async (
  input: string
): Promise<ExtractTitleResponse['result']> => {
  const res = await fetchData({
    url: `${store.baseUrl}/gemini/extractTitle`,
    body: {
      input,
    },
    responseSchema: zExtractTitleResponse,
    method: 'POST',
  })

  if (!res.success) {
    throw new Error(res.message)
  }

  return res.result
}
