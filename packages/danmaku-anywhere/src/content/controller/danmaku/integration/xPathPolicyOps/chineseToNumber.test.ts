import { describe, expect, it } from 'vitest'
import { chineseToNumber } from './chineseToNumber'

describe('chineseToNumber', () => {
  it('should convert simple digits', () => {
    expect(chineseToNumber('一')).toBe(1)
    expect(chineseToNumber('二')).toBe(2)
    expect(chineseToNumber('五')).toBe(5)
    expect(chineseToNumber('九')).toBe(9)
    expect(chineseToNumber('零')).toBe(0)
  })

  it('should convert tens', () => {
    expect(chineseToNumber('十')).toBe(10)
    expect(chineseToNumber('十一')).toBe(11)
    expect(chineseToNumber('十五')).toBe(15)
    expect(chineseToNumber('十九')).toBe(19)
    expect(chineseToNumber('二十')).toBe(20)
    expect(chineseToNumber('九十九')).toBe(99)
  })

  it('should convert hundreds', () => {
    expect(chineseToNumber('一百')).toBe(100)
    expect(chineseToNumber('一百零五')).toBe(105)
    expect(chineseToNumber('一百一十')).toBe(110)
    expect(chineseToNumber('一百五十')).toBe(150)
    expect(chineseToNumber('九百九十九')).toBe(999)
  })

  it('should handle large numbers reasonably', () => {
    expect(chineseToNumber('一千')).toBe(1000)
    expect(chineseToNumber('一万')).toBe(10000)
    expect(chineseToNumber('一万零一')).toBe(10001)
    expect(chineseToNumber('一万一千一百零五')).toBe(11105)
  })

  it('should fallback or return null for invalid', () => {
    expect(chineseToNumber('Abc')).toBe(null)
  })

  it('should return number if the string is numeric', () => {
    expect(chineseToNumber('1')).toBe(1)
  })
})
