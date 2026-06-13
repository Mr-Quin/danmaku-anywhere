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

  it('reports loading while starting, before the first mask', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    expect(d.current()).toEqual({ source: 'occlusion', state: 'loading' })
  })

  it('surfaces the download message while loading', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setStatus(status('downloading', 'downloading model'))
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'loading',
      message: 'downloading model',
    })
  })

  it('reports on once the first mask is applied', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setStatus(status('downloading'))
    d.setActive()
    expect(d.current()).toEqual({ source: 'occlusion', state: 'on' })
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

  it('stays on through a transient failure while the loop keeps running', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setActive()
    d.setStatus(status('segment'))
    expect(d.current()).toEqual({ source: 'occlusion', state: 'on' })
  })

  it('surfaces an init failure that stops startup', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    // The service stops the loop, then reports the reason.
    d.setRunning(false)
    d.setStatus(status('init', 'provider init failed'))
    expect(d.current()).toEqual({
      source: 'occlusion',
      state: 'error',
      message: 'provider init failed',
    })
  })

  it('clears to no entry when the loop stops without an error', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    d.setActive()
    d.setRunning(false)
    expect(d.current()).toBeUndefined()
  })

  it('clears a stranded error when the feature is disengaged', () => {
    const d = new OcclusionEntryDeriver()
    d.setStatus(status('init', 'init failed'))
    expect(d.current()?.state).toBe('error')
    d.reset()
    expect(d.current()).toBeUndefined()
  })

  it('clears a stranded loading row when the feature is disengaged', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(true)
    expect(d.current()?.state).toBe('loading')
    d.reset()
    expect(d.current()).toBeUndefined()
  })

  it('clears a prior error when occlusion restarts', () => {
    const d = new OcclusionEntryDeriver()
    d.setRunning(false)
    d.setStatus(status('init'))
    expect(d.current()?.state).toBe('error')
    d.setRunning(true)
    expect(d.current()).toEqual({ source: 'occlusion', state: 'loading' })
  })
})
