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
import {
  DanmakuSourceType,
  PROVIDER_TO_BUILTIN_ID,
  resolveBuiltinManifestId,
  stripBuiltinPrefix,
} from '../provider/provider.js'
import type { SeasonInsertV1 } from '../season/index.js'

const zImportV3 = z
  .union([
    zEpisodeImportV1.transform(episodeMigration.v1ToV3),
    zEpisodeImportV2.transform(episodeMigration.v2ToV3),
    zEpisodeImportV3.transform(episodeMigration.v3ToV3),
  ])
  .transform((data): BackupParseData => {
    if (data.provider === DanmakuSourceType.MacCMS) {
      return {
        type: 'Custom',
        episode: episodeMigration.customV3ToV4(data),
      }
    }
    // biome-ignore lint/correctness/noUnusedVariables: remove the seasonId
    const { seasonId, ...rest } = episodeMigration.v3ToV4(data, 0)
    return {
      type: 'Regular',
      season: episodeMigration.v3ExtractSeason(data),
      episode: rest,
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

type BackupParseError = {
  type: 'Error'
  errors: unknown[]
}

export type BackupParseResult = {
  // indexed
  parsed: [number, BackupParseData][]
  // array of indices of errored items
  skipped: [number, unknown[]][]
}

function builtinIdFromProviderTag(provider: unknown): string | undefined {
  if (typeof provider !== 'string' || !(provider in PROVIDER_TO_BUILTIN_ID)) {
    return undefined
  }
  return PROVIDER_TO_BUILTIN_ID[provider as DanmakuSourceType]
}

// Backups from v1.5.0 tag seasons with `provider` and a possibly prefixed
// providerConfigId; older ones predate providerConfigId, which was always the
// built-in instance of the tagged provider then.
function withSeasonSource(
  season: Record<string, unknown>
): Record<string, unknown> {
  const fromProviderTag = builtinIdFromProviderTag(season['provider'])
  const providerConfigId =
    typeof season['providerConfigId'] === 'string'
      ? stripBuiltinPrefix(season['providerConfigId'])
      : fromProviderTag
  const manifestId =
    typeof season['manifestId'] === 'string'
      ? season['manifestId']
      : (resolveBuiltinManifestId(providerConfigId) ?? fromProviderTag)
  return { ...season, manifestId, providerConfigId }
}

const zEpisodeInsertV4WithSeasonV1Preprocessed = z.preprocess((data) => {
  if (data === null || typeof data !== 'object' || !('season' in data)) {
    return data
  }
  const { season } = data
  if (season === null || typeof season !== 'object') {
    return data
  }
  return {
    ...data,
    season: withSeasonSource(season as Record<string, unknown>),
  }
}, zEpisodeInsertV4WithSeasonV1)

const parseBackup = (data: unknown): BackupParseData | BackupParseError => {
  const errors = []
  // first see if data is v3
  {
    const parse = zImportV3.safeParse(data)
    if (parse.success) {
      return parse.data
    }
    errors.push(parse.error)
  }

  // Try regular v4 before custom: a custom episode has no `season`, so it fails
  // the with-season schema and falls through. The reverse order would misparse
  // a regular episode as custom, since the custom schema no longer carries a
  // discriminating field and zod ignores the extra regular-only keys.
  {
    const parse = zEpisodeInsertV4WithSeasonV1Preprocessed.safeParse(data)
    if (parse.success) {
      return {
        type: 'Regular',
        season: parse.data.season,
        episode: parse.data,
      }
    }
    errors.push(parse.error)
  }

  // Try custom v4, but never for a season-bearing entry: that is a malformed
  // regular episode, and parsing it as Custom would silently strip its season
  // instead of reporting it as skipped.
  const carriesSeason =
    data !== null &&
    typeof data === 'object' &&
    ('season' in data || 'seasonId' in data)
  if (!carriesSeason) {
    const parse = zCustomEpisodeInsertV4.safeParse(data)
    if (parse.success) {
      return {
        type: 'Custom',
        episode: parse.data,
      }
    }
    errors.push(parse.error)
  }

  return {
    type: 'Error',
    errors,
  }
}

export const parseBackupMany = (data: unknown[]): BackupParseResult => {
  const imported: [number, BackupParseData][] = []
  const skipped: [number, unknown[]][] = []

  for (const [i, item] of data.entries()) {
    const result = parseBackup(item)
    if (result.type === 'Error') {
      skipped.push([i, result.errors])
    } else {
      imported.push([i, result])
    }
  }

  return {
    parsed: imported,
    skipped,
  }
}
