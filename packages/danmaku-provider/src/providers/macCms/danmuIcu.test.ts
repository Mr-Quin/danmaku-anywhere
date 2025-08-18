import { describe, expect, test } from 'vitest'
import { zDanmuIcuDanmaku } from './danmuIcu'
import data from './danmuIcu.json' with { type: 'json' }

describe('Parse danmuIcu', () => {
  test('should parse correctly', () => {
    const result = zDanmuIcuDanmaku.parse(data)
    expect(result).toHaveLength(3600)
    expect(result[0].m).toBe('我需要一个吐槽役的角色出场')
    expect(result[0].p).toBe('1158.293,1,8811256')
  })
})
