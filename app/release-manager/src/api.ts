import { invoke } from '@tauri-apps/api/core'
import type { PublicState, ReleaseAsset } from './types.js'

export async function getState(): Promise<PublicState> {
  return invoke<PublicState>('get_state')
}

export async function getReleases(): Promise<ReleaseAsset[]> {
  return invoke<ReleaseAsset[]>('list_releases')
}

export async function downloadBuild(tag: string): Promise<PublicState> {
  return invoke<PublicState>('download_build', { tag })
}

export async function setActive(tag: string): Promise<PublicState> {
  return invoke<PublicState>('set_active', { tag })
}

export async function removeBuild(tag: string): Promise<PublicState> {
  return invoke<PublicState>('remove_build', { tag })
}
