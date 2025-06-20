import { cfStore } from '../../shared/cf.js'
import { fetchData } from '../utils/fetchData.js'
import type { ExtractTitleResponse } from './schema.js'
import { zExtractTitleResponse } from './schema.js'

export const extractTitle = async (
  input: string
): Promise<ExtractTitleResponse['result']> => {
  const res = await fetchData({
    url: `${cfStore}/gemini/extractTitle`,
    body: {
      input,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zExtractTitleResponse,
    method: 'POST',
  })

  if (!res.success) {
    throw new Error(res.message)
  }

  if (res.result.title.trim().length === 0) {
    throw new Error('No title found')
  }

  return res.result
}
