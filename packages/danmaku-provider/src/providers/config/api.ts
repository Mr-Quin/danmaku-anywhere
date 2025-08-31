import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import { type ConfigResponse, zConfigResponse } from './schema.js'

export const getMaccmsConfig = async (
  input: string
): Promise<ConfigResponse> => {
  return await fetchData({
    url: `${getApiStore().baseUrl}/config/maccms`,
    body: {
      input,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zConfigResponse,
    method: 'POST',
  })
}

export const getDanmuicuConfig = async (
  input: string
): Promise<ConfigResponse> => {
  return await fetchData({
    url: `${getApiStore().baseUrl}/config/danmuicu`,
    body: {
      input,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zConfigResponse,
    method: 'POST',
  })
}
