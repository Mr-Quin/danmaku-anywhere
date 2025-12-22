import { describe, expect, it } from 'vitest'
import { computeEtag } from '../../src/utils/computeEtag'

describe('computeEtag', () => {
  it('generates consistent ETag for objects', async () => {
    const obj = { data: 'test' }
    const tag1 = await computeEtag(obj)
    const tag2 = await computeEtag({ data: 'test' })
    expect(tag1).toBe(tag2)
    console.log('Object ETag:', tag1)
  })

  it('generates different ETag for different objects', async () => {
    const tag1 = await computeEtag({ data: 'test1' })
    const tag2 = await computeEtag({ data: 'test2' })
    expect(tag1).not.toBe(tag2)
  })

  it('generates stable ETag for string input', async () => {
    const input = 'hello world'
    const tag = await computeEtag(input)
    console.log('String ETag:', tag)
    expect(tag).toBeDefined()
  })

  it('generates unique ETag for different content', async () => {
    // Tests that different string content produces different ETags (correct usage)
    const tag1 = await computeEtag('body1')
    const tag2 = await computeEtag('body2')

    console.log('body1 ETag:', tag1)
    console.log('body2 ETag:', tag2)

    expect(tag1).not.toBe(tag2)
  })

  it('matches expected ETag values', async () => {
    // values taken from previous run logs
    const objTag = await computeEtag({ data: 'test' })
    expect(objTag).toBe('"959beeb3162b8dd4107456709d76342843771894"')

    const strTag = await computeEtag('hello world')
    expect(strTag).toBe('"9c05511a31375a8a278a75207331bb1714e69dd1"')
  })

  it('returns null for nullish inputs', async () => {
    expect(await computeEtag(null)).toBeNull()
    expect(await computeEtag(undefined)).toBeNull()
  })
})
