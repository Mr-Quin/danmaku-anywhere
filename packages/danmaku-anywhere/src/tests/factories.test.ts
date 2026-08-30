import {
  zEpisodeInsertV4,
  zSeasonInsertV1,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { providerConfigSchema } from '@/common/options/providerConfig/schema'
import {
  makeEpisode,
  makeProviderConfig,
  makeSeason,
  makeSeasonInsert,
  makeSeasonRow,
} from './factories'

/**
 * Verifies the shared factories produce complete persisted entities and option
 * records. Tests can override individual fields without falling back to casts.
 */
describe('test factories', () => {
  it('creates a schema-valid provider config with overrides', () => {
    const config = makeProviderConfig({ manifestId: 'bilibili' })

    expect(providerConfigSchema.parse(config)).toEqual(config)
    expect(config.manifestId).toBe('bilibili')
  })

  it('creates a schema-valid season insert with overrides', () => {
    const season = makeSeasonInsert({ manifestId: 'bilibili' })

    expect(zSeasonInsertV1.parse(season)).toEqual(season)
    expect(season.manifestId).toBe('bilibili')
    expect(season).not.toHaveProperty('id')
  })

  it('creates a season row carrying the columns Dexie assigns an id for', () => {
    const row = makeSeasonRow({ version: 3 })

    expect(zSeasonInsertV1.parse(row)).toMatchObject({ title: 'Test season' })
    expect(row.version).toBe(3)
    expect(row.timeUpdated).toBeTypeOf('number')
    expect(row).not.toHaveProperty('id')
  })

  it('creates a schema-valid persisted season with overrides', () => {
    const season = makeSeason({ title: 'Frieren' })

    expect(zSeasonInsertV1.parse(season)).toMatchObject({ title: 'Frieren' })
    expect(season.title).toBe('Frieren')
    expect(season.id).toBeTypeOf('number')
  })

  it('creates a schema-valid episode entity with overrides', () => {
    const episode = makeEpisode({ episodeNumber: 2 })

    expect(zEpisodeInsertV4.parse(episode)).toMatchObject({ episodeNumber: 2 })
    expect(episode.episodeNumber).toBe(2)
    expect(episode.id).toBeTypeOf('number')
  })
})
