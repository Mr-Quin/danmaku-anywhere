import { produce } from 'immer'
import { describe, expect, it } from 'vitest' // Assuming you're using Vitest
import { Logger } from '@/common/Logger'
import { migrateOptions } from './migrationOptions'
import type { Options, Version } from './types' // Replace with your actual path

const createOptions = <T>(data: T, version: number): Options<T> => ({
  data,
  version,
})

describe('migrateOptions', () => {
  const logger = Logger

  it('should not upgrade if already at latest version', () => {
    const options = createOptions({ foo: 'bar' }, 2)

    const versions: Version[] = [
      { version: 1, upgrade: (d) => d },
      { version: 2, upgrade: (d) => d },
    ]

    const result = migrateOptions(options, versions, logger, {})

    expect(result).toEqual(options)
  })

  it('should upgrade through multiple versions', () => {
    const options = createOptions({ foo: 'bar' }, 0)
    const versions: Version[] = [
      { version: 1, upgrade: (d: any) => ({ ...d, bar: 'baz' }) },
      { version: 2, upgrade: (d: any) => ({ ...d, baz: 'qux' }) },
    ]

    const result = migrateOptions(options, versions, logger, {})

    expect(result).toEqual(
      createOptions({ foo: 'bar', bar: 'baz', baz: 'qux' }, 2)
    )
  })

  it('should handle partial upgrades', () => {
    const options = createOptions({ foo: 'bar' }, 1)
    const versions: Version[] = [
      { version: 1, upgrade: (d: any) => d }, // No change in version 1
      { version: 2, upgrade: (d: any) => ({ ...d, bar: 'baz' }) },
    ]

    const result = migrateOptions(options, versions, logger, {})

    expect(result).toEqual(createOptions({ foo: 'bar', bar: 'baz' }, 2))
  })

  it('should operate on the return of the previous version', () => {
    const options = createOptions({ foo: 'bar' }, 0)
    const versions: Version[] = [
      { version: 1, upgrade: (d: any) => ({ ...d, bar: { baz: 1 } }) },
      {
        version: 2,
        upgrade: (d: any) => {
          d.bar.baz = 2 // bar.baz is added in the previous version
          d.baq = 3
          return d
        },
      },
    ]

    const v1 = migrateOptions(options, [versions[0]], logger, {})
    expect(v1).toEqual(createOptions({ foo: 'bar', bar: { baz: 1 } }, 1))

    const v2 = migrateOptions(v1, [versions[1]], logger, {})
    expect(v2).toEqual(
      createOptions({ foo: 'bar', baq: 3, bar: { baz: 2 } }, 2)
    )
  })

  it('should handle deeply nested options', () => {
    const options = createOptions({ foo: { bar: { baz: 'qux' } } }, 1)
    const versions: Version[] = [
      {
        version: 2,
        upgrade: (d) =>
          produce<any>(d, (draft) => {
            draft.foo.bar.baz = 'updated'
            draft.foo.newProp = 'added'
          }),
      },
    ]

    const result = migrateOptions(options, versions, logger, {})

    expect(result).toEqual(
      createOptions({ foo: { bar: { baz: 'updated' }, newProp: 'added' } }, 2)
    )
  })

  it('should remove nested options', () => {
    const options = createOptions({ foo: { bar: { baz: 'qux' } } }, 1)
    const versions: Version[] = [
      {
        version: 2,
        upgrade: (d) =>
          produce<any>(d, (draft) => {
            delete draft.foo.bar.baz
          }),
      },
    ]

    const result = migrateOptions(options, versions, logger, {})

    expect(result).toEqual(createOptions({ foo: { bar: {} } }, 2))
  })

  it('should handle complex nested changes (add, remove, update)', () => {
    const options = createOptions({ a: { b: 1, c: 2 }, d: 3 }, 1)
    const versions: Version[] = [
      {
        version: 2,
        upgrade: (d) =>
          produce<any>(d, (draft) => {
            draft.a.b += 10
            delete draft.a.c
            draft.a.e = 5
            draft.d = 'new value'
          }),
      },
    ]

    const result = migrateOptions(options, versions, logger, {})
    expect(result).toEqual(
      createOptions({ a: { b: 11, e: 5 }, d: 'new value' }, 2)
    )
  })
})
