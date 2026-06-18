import { invoke } from '@tauri-apps/api/core'
import type { PublicState, ReleaseAsset } from './types.js'

// invoke() rejects with the serialized RmError object {kind, message} rather than
// a JS Error, so String(err) would show "[object Object]" in the UI. Unwrap it here.
function unwrapError(err: unknown): never {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message: unknown }).message
    if (typeof msg === 'string') {
      throw new Error(msg)
    }
  }
  throw err
}

export async function getState(): Promise<PublicState> {
  return invoke<PublicState>('get_state').catch(unwrapError)
}

export async function getReleases(): Promise<ReleaseAsset[]> {
  return invoke<ReleaseAsset[]>('list_releases').catch(unwrapError)
}

export async function downloadBuild(tag: string): Promise<PublicState> {
  return invoke<PublicState>('download_build', { tag }).catch(unwrapError)
}

export async function setActive(tag: string): Promise<PublicState> {
  return invoke<PublicState>('set_active', { tag }).catch(unwrapError)
}

export async function removeBuild(tag: string): Promise<PublicState> {
  return invoke<PublicState>('remove_build', { tag }).catch(unwrapError)
}
