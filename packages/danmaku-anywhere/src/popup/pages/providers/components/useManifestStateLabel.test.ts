import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { manifestStateOf } from './useManifestStateLabel'

const dandanplay: ProviderManifestInfo = {
  id: 'dandanplay',
  name: 'DanDanPlay',
  version: '0.6.1',
  kind: 'preinstalled',
}

const newer: ProviderManifestInfo = {
  id: 'future',
  name: 'Future',
  version: '9.0.0',
  kind: 'user',
  unavailable: 'needs-newer-extension',
}

const listed = new Map([
  [dandanplay.id, dandanplay],
  [newer.id, newer],
])

describe('manifestStateOf', () => {
  it('reports a listed manifest as the list has it', () => {
    expect(manifestStateOf('dandanplay', listed, true)).toBe(dandanplay)
    expect(manifestStateOf('future', listed, true)?.unavailable).toBe(
      'needs-newer-extension'
    )
  })

  it('reports a config whose manifest is missing from the loaded list as not installed', () => {
    expect(manifestStateOf('ghost', listed, true)).toEqual({
      unavailable: 'not-registered',
    })
  })

  it('knows nothing before the list loads', () => {
    expect(manifestStateOf('ghost', new Map(), false)).toBeUndefined()
  })

  it('never reports legacy MacCMS, which has no manifest', () => {
    expect(manifestStateOf(LEGACY_MACCMS_ID, listed, true)).toBeUndefined()
  })
})
