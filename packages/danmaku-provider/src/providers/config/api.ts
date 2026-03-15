import type { Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError'
import { getApiStore } from '../../shared/store'
import { fetchData } from '../utils/fetchData'
import { type ConfigResponse, zConfigResponse } from './schema'

export const getMaccmsConfig = async (
  force = false
): Promise<Result<ConfigResponse, DanmakuProviderError>> => {
  const url = `${getApiStore().baseUrl}/config/maccms`
  const headers: Record<string, string> = {
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
): Promise<Result<ConfigResponse, DanmakuProviderError>> => {
  const url = `${getApiStore().baseUrl}/config/danmuicu`
  const headers: Record<string, string> = {
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
