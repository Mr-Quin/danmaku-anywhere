import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import type { ExtractTitleResponse } from './schema.js'
import { zExtractTitleResponse } from './schema.js'

export const extractTitle = async (
  input: string
): Promise<Result<ExtractTitleResponse['result'], DanmakuProviderError>> => {
  const result = await fetchData({
    url: `${getApiStore().baseUrl}/llm/v1/extractTitle`,
    body: {
      input,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zExtractTitleResponse,
    method: 'POST',
    isDaRequest: true,
  })

  if (!result.success) {
    return result
  }

  const res = result.data

  if (!res.success) {
    return err(new Error(res.message))
  }

  if (res.result.title.trim().length === 0) {
    return err(new Error('No title found'))
  }

  return ok(res.result)
}
