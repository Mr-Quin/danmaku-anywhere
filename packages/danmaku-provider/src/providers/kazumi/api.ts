import { z } from 'zod'
import { fetchData } from '../utils/fetchData.js'
import {
  type KazumaManifest,
  type KazumiPolicy,
  zKazumaManifest,
  zKazumiPolicy,
} from './schema.js'

export const getManifest = async (): Promise<KazumaManifest[]> => {
  const res = await fetchData({
    url: 'https://raw.githubusercontent.com/Predidit/KazumiRules/main/index.json',
    responseSchema: z.array(zKazumaManifest),
  })

  return res
}

export const getPolicy = async (id: string): Promise<KazumiPolicy> => {
  const res = await fetchData({
    url: `https://raw.githubusercontent.com/Predidit/KazumiRules/main/${id}.json`,
    responseSchema: zKazumiPolicy,
  })

  return res
}
