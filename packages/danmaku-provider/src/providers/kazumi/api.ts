import { z } from 'zod'
import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import {
  type KazumaManifest,
  type KazumiPolicy,
  zKazumaManifest,
  zKazumiPolicy,
} from './schema.js'

export const getManifest = async (): Promise<KazumaManifest[]> => {
  const store = getApiStore()

  return await fetchData({
    url: `${store.baseUrl}/kazumi/rules`,
    responseSchema: z.array(zKazumaManifest),
  })
}

export const getPolicy = async (fileName: string): Promise<KazumiPolicy> => {
  const store = getApiStore()

  return await fetchData({
    url: `${store.baseUrl}/kazumi/rules/file`,
    query: {
      file: `${fileName}`,
    },
    responseSchema: zKazumiPolicy,
  })
}
