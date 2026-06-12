import { describe, expect, it } from 'vitest'
import type { OcclusionStatusReason } from '@/content/player/occlusion/Occlusion.types'
import { OcclusionEntryDeriver } from './occlusionEntry'

function status(reason: OcclusionStatusReason, message: string = reason) {
  return { reason, message }
}

describe('OcclusionEntryDeriver', () => {
  it('has no entry until the feature is engaged', () => {
    expect(new OcclusionEntryDeriver().current()).toBeUndefined()
  })

  it('maps downloading to loading with its message', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('downloading', 'downloading model'))
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'loading',
      message: 'downloading model',
    })
  })

  it('maps every failure reason to error with its message', () => {
    const failures: OcclusionStatusReason[] = [
      'init',
      'webgpu',
      'taint',
      'unavailable',
      'segment',
    ]
    for (const reason of failures) {
      const d = new OcclusionEntryDeriver()
      d.setStatus(status(reason, `${reason} failed`))
      expect(d.current()).toEqual({
        source: 'occlusion',
        state: 'error',
        message: `${reason} failed`,
      })
    }
  })

  it('reports on while running, clearing any prior loading or error', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('downloading'))
    d.setRunning(true)
    expect(d.current()).toEqual({ source: 'occlusion', state: 'on' })
  })

  it('lets running win over a status error until the loop actually stops', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setStatus(status('segment'))
    expect(d.current()).toEqual({ source: 'occlusion', state: 'on' })
    d.setRunning(false)
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'error',
      message: 'segment',
    })
  })

  it('clears to no entry when stopped without an error', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setRunning(false)
    expect(d.current()).toBeUndefined()
  })

  it('replaces loading with error when a failure follows a download', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('downloading'))
    d.setStatus(status('init', 'init failed'))
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'error',
      message: 'init failed',
    })
  })

  it('keeps showing loading when the loop stops mid-download', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('downloading', 'downloading model'))
    // Stopping does not clear loading; only a successful run does.
    d.setRunning(false)
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'loading',
      message: 'downloading model',
    })
  })

  it('returns to no entry across a full error, run, stop cycle', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('segment'))
    d.setRunning(true)
    d.setRunning(false)
    expect(d.current()).toBeUndefined()
  })
})
