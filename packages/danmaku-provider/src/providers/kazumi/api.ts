import type { Result } from '@danmaku-anywhere/result'
import { z } from 'zod'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import {
  type KazumaManifest,
  type KazumiPolicy,
  zKazumaManifest,
  zKazumiPolicy,
} from './schema.js'

export const getManifest = async (): Promise<
  Result<KazumaManifest[], DanmakuProviderError>
> => {
  const store = getApiStore()

  return await fetchData({
    url: `${store.baseUrl}/kazumi/rules`,
    responseSchema: z.array(zKazumaManifest),
    isDaRequest: true,
  })
}

export const getPolicy = async (
  fileName: string
): Promise<Result<KazumiPolicy, DanmakuProviderError>> => {
  const store = getApiStore()

  return await fetchData({
    url: `${store.baseUrl}/kazumi/rules/file`,
    query: {
      file: `${fileName}`,
    },
    responseSchema: zKazumiPolicy,
    isDaRequest: true,
  })
}
