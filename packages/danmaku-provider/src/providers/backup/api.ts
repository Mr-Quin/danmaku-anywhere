import { ok, type Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { getApiStore } from '../../shared/store.js'
import { fetchData } from '../utils/fetchData.js'
import type { CloudBackupItem, CreateBackupResponse } from './schema.js'
import {
  zCreateBackupResponse,
  zDownloadBackupResponse,
  zListBackupsResponse,
} from './schema.js'

export interface BackupAuthContext {
  token: string
}

const getAuthHeaders = (auth: BackupAuthContext) => {
  return {
    Authorization: `Bearer ${auth.token}`,
    'Content-Type': 'application/json',
  }
}

export const listCloudBackups = async (
  auth: BackupAuthContext
): Promise<Result<CloudBackupItem[], DanmakuProviderError>> => {
  const result = await fetchData({
    url: `${getApiStore().baseUrl}/backup`,
    method: 'GET',
    headers: getAuthHeaders(auth),
    responseSchema: zListBackupsResponse,
    isDaRequest: true,
  })

  if (!result.success) {
    return result
  }

  return ok(result.data.backups)
}

export const createCloudBackup = async (
  data: unknown,
  extensionVersion: string | undefined,
  auth: BackupAuthContext
): Promise<Result<CreateBackupResponse, DanmakuProviderError>> => {
  return fetchData({
    url: `${getApiStore().baseUrl}/backup`,
    method: 'POST',
    headers: getAuthHeaders(auth),
    body: {
      data,
      extensionVersion,
    } as Record<string, unknown>,
    responseSchema: zCreateBackupResponse,
    isDaRequest: true,
  })
}

export const downloadCloudBackup = async (
  id: string,
  auth: BackupAuthContext
): Promise<Result<unknown, DanmakuProviderError>> => {
  const result = await fetchData({
    url: `${getApiStore().baseUrl}/backup/${id}`,
    method: 'GET',
    headers: getAuthHeaders(auth),
    responseSchema: zDownloadBackupResponse,
    isDaRequest: true,
  })

  if (!result.success) {
    return result
  }

  return ok(result.data.data)
}
