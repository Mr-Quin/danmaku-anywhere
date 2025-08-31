import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import { type ConfigResponse, zConfigResponse } from './schema.js'

export const getMaccmsConfig = async (): Promise<ConfigResponse> => {
  return await fetchData({
    url: `${getApiStore().baseUrl}/config/maccms`,
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zConfigResponse,
    method: 'GET',
  })
}

export const getDanmuicuConfig = async (): Promise<ConfigResponse> => {
  return await fetchData({
    url: `${getApiStore().baseUrl}/config/danmuicu`,
    headers: {
      'Content-Type': 'application/json',
    },
    responseSchema: zConfigResponse,
    method: 'GET',
  })
}
