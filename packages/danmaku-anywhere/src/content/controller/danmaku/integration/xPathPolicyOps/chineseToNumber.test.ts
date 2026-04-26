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
    expect(chineseToNumber('')).toBe(null)
    expect(chineseToNumber('Abc')).toBe(null)
    expect(chineseToNumber('一个')).toBe(null)
    expect(chineseToNumber('一千ABC')).toBe(null)
    expect(chineseToNumber('一千123')).toBe(null)
    expect(chineseToNumber('1一2千3')).toBe(null)
  })

  it('should return number if the string is numeric', () => {
    expect(chineseToNumber('1')).toBe(1)
    expect(chineseToNumber('123')).toBe(123)
    expect(chineseToNumber('123456789')).toBe(123456789)
  })

  it('should convert formal numerals (大写数字)', () => {
    expect(chineseToNumber('壹')).toBe(1)
    expect(chineseToNumber('贰')).toBe(2)
    expect(chineseToNumber('貳')).toBe(2)
    expect(chineseToNumber('叁')).toBe(3)
    expect(chineseToNumber('參')).toBe(3)
    expect(chineseToNumber('弎')).toBe(3)
    expect(chineseToNumber('肆')).toBe(4)
    expect(chineseToNumber('伍')).toBe(5)
    expect(chineseToNumber('陆')).toBe(6)
    expect(chineseToNumber('陸')).toBe(6)
    expect(chineseToNumber('柒')).toBe(7)
    expect(chineseToNumber('捌')).toBe(8)
    expect(chineseToNumber('玖')).toBe(9)
    expect(chineseToNumber('兩')).toBe(2)
  })

  it('should convert formal tens, hundreds, and thousands', () => {
    expect(chineseToNumber('拾')).toBe(10)
    expect(chineseToNumber('拾壹')).toBe(11)
    expect(chineseToNumber('拾贰')).toBe(12)
    expect(chineseToNumber('贰拾')).toBe(20)
    expect(chineseToNumber('贰拾叁')).toBe(23)
    expect(chineseToNumber('玖拾玖')).toBe(99)
    expect(chineseToNumber('壹佰')).toBe(100)
    expect(chineseToNumber('壹佰零伍')).toBe(105)
    expect(chineseToNumber('壹仟')).toBe(1000)
    expect(chineseToNumber('壹萬')).toBe(10000)
  })
})
