import { describe, expect, it } from 'vitest'
import { isIntegrationV1 } from './v1.js'

describe('v1 migration', () => {
  it('should identify valid v1 integration policy', () => {
    const validV1 = {
      name: 'test',
      id: 'test-id',
      policy: {
        title: { selector: [], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        titleOnly: false,
      },
    }
    expect(isIntegrationV1(validV1)).toBe(true)
  })

  it('should reject object with version field', () => {
    const invalid = {
      name: 'test',
      id: 'test-id',
      version: 2,
      policy: {},
    }
    expect(isIntegrationV1(invalid)).toBe(false)
  })

  it('should reject object with options', () => {
    const invalid = {
      name: 'test',
      id: 'test-id',
      policy: {},
      options: {},
    }
    expect(isIntegrationV1(invalid)).toBe(false)
  })
})
