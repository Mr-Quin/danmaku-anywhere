import { describe, expect, it } from 'vitest'
import type { OcclusionEntry, PipelineEntry } from './panelEntry'
import { resolvePanelEntries } from './resolvePanelEntries'

const PIPELINE: PipelineEntry = {
  source: 'pipeline',
  substate: 'mounted',
  commentCount: 42,
}

const OCCLUSION: OcclusionEntry = {
  source: 'occlusion',
  state: 'on',
}

describe('resolvePanelEntries', () => {
  it('returns an empty array when no entries are present', () => {
    expect(resolvePanelEntries({})).toEqual([])
  })

  it('returns only the pipeline entry when occlusion is absent', () => {
    const result = resolvePanelEntries({ pipeline: PIPELINE })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(PIPELINE)
  })

  it('returns only the occlusion entry when pipeline is absent', () => {
    const result = resolvePanelEntries({ occlusion: OCCLUSION })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(OCCLUSION)
  })

  it('returns both entries when both are present', () => {
    const result = resolvePanelEntries({
      pipeline: PIPELINE,
      occlusion: OCCLUSION,
    })
    expect(result).toHaveLength(2)
  })

  it('always puts pipeline before occlusion regardless of insertion order', () => {
    const result = resolvePanelEntries({
      occlusion: OCCLUSION,
      pipeline: PIPELINE,
    })
    expect(result[0].source).toBe('pipeline')
    expect(result[1].source).toBe('occlusion')
  })

  it('references the same entry instances', () => {
    const result = resolvePanelEntries({
      pipeline: PIPELINE,
      occlusion: OCCLUSION,
    })
    expect(result[0]).toBe(PIPELINE)
    expect(result[1]).toBe(OCCLUSION)
  })

  it('returns a new array each call', () => {
    const entries = { pipeline: PIPELINE }
    expect(resolvePanelEntries(entries)).not.toBe(resolvePanelEntries(entries))
  })
})
