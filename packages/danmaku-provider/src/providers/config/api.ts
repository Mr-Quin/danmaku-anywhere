import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import { type ConfigResponse, zConfigResponse } from './schema.js'

export const getMaccmsConfig = async (
  force = false
): Promise<ConfigResponse> => {
  const url = `${getApiStore().baseUrl}/config/maccms`
  const headers = {
    'Content-Type': 'application/json',
  }
  if (force) {
    headers['Cache-Control'] = 'no-cache'
  }
  return await fetchData({
    url,
    headers,
    responseSchema: zConfigResponse,
    method: 'GET',
  })
}

export const getDanmuicuConfig = async (
  force = false
): Promise<ConfigResponse> => {
  const url = `${getApiStore().baseUrl}/config/danmuicu`
  const headers = {
    'Content-Type': 'application/json',
  }
  if (force) {
    headers['Cache-Control'] = 'no-cache'
  }
  return await fetchData({
    url,
    headers,
    responseSchema: zConfigResponse,
    method: 'GET',
  })
}
