import { z } from 'zod'
import {
  type CustomEpisodeInsertV4,
  type EpisodeImportV4,
  episodeMigration,
  zCustomEpisodeInsertV4,
  zEpisodeInsertV4WithSeasonV1,
} from '../episode/index.js'
import { zEpisodeImportV1 } from '../episode/v1/schema.js'
import { zEpisodeImportV2 } from '../episode/v2/schema.js'
import { zEpisodeImportV3 } from '../episode/v3/schemaZod.js'
import { DanmakuSourceType } from '../provider/provider.js'
import type { SeasonInsertV1 } from '../season/index.js'

const zImportV3 = z
  .union([
    zEpisodeImportV1.transform(episodeMigration.v1ToV3),
    zEpisodeImportV2.transform(episodeMigration.v2ToV3),
    zEpisodeImportV3.transform(episodeMigration.v3ToV3),
  ])
  .transform((data): BackupParseData => {
    if (data.provider === DanmakuSourceType.Custom) {
      return {
        type: 'Custom',
        episode: episodeMigration.customV3ToV4(data),
      }
    } else {
      // remove the seasonId
      const { seasonId, ...rest } = episodeMigration.v3ToV4(data, 0)
      return {
        type: 'Regular',
        season: episodeMigration.v3ExtractSeason(data),
        episode: rest,
      }
    }
  })

export type BackupParseData =
  | {
      type: 'Custom'
      episode: CustomEpisodeInsertV4
    }
  | {
      type: 'Regular'
      season: SeasonInsertV1
      episode: EpisodeImportV4
    }

export type BackupParseResult = {
  // indexed
  parsed: [number, BackupParseData][]
  // array of indices of skipped items
  skipped: number[]
}

export const parseBackup = (data: unknown): BackupParseData | undefined => {
  // first see if data is v3
  {
    const parse = zImportV3.safeParse(data)
    if (parse.success) {
      return parse.data
    }
  }

  // try custom v4
  {
    const parse = zCustomEpisodeInsertV4.safeParse(data)
    if (parse.success) {
      return {
        type: 'Custom',
        episode: parse.data,
      }
    }
  }

  // try regular v4
  {
    const parse = zEpisodeInsertV4WithSeasonV1.safeParse(data)
    if (parse.success) {
      return {
        type: 'Regular',
        season: parse.data.season,
        episode: parse.data,
      }
    }
  }
}

export const parseBackupMany = (data: unknown[]): BackupParseResult => {
  const imported: [number, BackupParseData][] = []
  const skipped: number[] = []

  for (const [i, item] of data.entries()) {
    const result = parseBackup(item)
    if (!result) {
      skipped.push(i)
    } else {
      imported.push([i, result])
    }
  }

  return {
    parsed: imported,
    skipped,
  }
}
