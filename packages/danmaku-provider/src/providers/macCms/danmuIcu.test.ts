import { describe, expect, test } from 'vitest'
import { zDanmuIcuDanmaku } from './danmuIcu'
import data from './danmuIcu.json' with { type: 'json' }

describe('Parse danmuIcu', () => {
  test('should parse correctly', () => {
    const result = zDanmuIcuDanmaku.parse(data)

    // Verify structure
    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('danum')
    expect(result).toHaveProperty('danmuku')

    // Verify parsed danmuku array
    expect(Array.isArray(result.danmuku)).toBe(true)
    expect(result.danmuku.length).toBeGreaterThan(0)

    // Verify first comment is correctly transformed
    const firstComment = result.danmuku.find(
      (c) => c.m === '我需要一个吐槽役的角色出场'
    )
    expect(firstComment).toBeDefined()
    expect(firstComment?.p).toBe('1158.293,1,8811256')
  })
})
