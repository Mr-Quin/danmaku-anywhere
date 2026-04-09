import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { LocalStorageService } from './LocalStorageService'

describe('LocalStorageService', () => {
  let service: LocalStorageService<string[]>

  beforeEach(() => {
    service = new LocalStorageService<string[]>('testKey')
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('read returns undefined when key does not exist', () => {
    expect(service.read()).toBeUndefined()
  })

  test('write and read round-trip correctly', () => {
    service.write(['a', 'b', 'c'])
    expect(service.read()).toEqual(['a', 'b', 'c'])
  })

  test('namespaces keys with danmaku-anywhere prefix', () => {
    service.write(['x'])
    expect(localStorage.getItem('__da_x:testKey')).toBe('["x"]')
  })

  test('remove clears the stored value', () => {
    service.write(['a'])
    service.remove()
    expect(service.read()).toBeUndefined()
  })

  test('read returns undefined for invalid JSON', () => {
    localStorage.setItem('__da_x:testKey', '{not valid json')
    expect(service.read()).toBeUndefined()
  })

  test('different keys are isolated', () => {
    const other = new LocalStorageService<number>('otherKey')
    service.write(['a'])
    other.write(42)
    expect(service.read()).toEqual(['a'])
    expect(other.read()).toBe(42)
  })
})
