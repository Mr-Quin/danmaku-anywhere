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

// Recover builtin identity from a backup the way the v15 migration does:
// structurally, from providerConfigId. A built-in id stamps manifestId; a
// self-hosted uuid stays unstamped (imports as an orphan, not mislabeled as the
// public instance); a backup predating providerConfigId falls back to its
// provider tag (safe: self-hosted didn't exist then).
//
// An imported self-hosted orphan is permanent, unlike a migrated one: the uuid
// is meaningless off its origin machine, so the schema drops it and the
// reconciler can't match it. It still imports and renders, but can't reparent.
function recoverBackupManifestId(season: {
  manifestId?: unknown
  providerConfigId?: unknown
  provider?: unknown
}): string | undefined {
  const fromConfigId = resolveBuiltinManifestId(
    typeof season.providerConfigId === 'string'
      ? season.providerConfigId
      : undefined
  )
  if (fromConfigId) {
    return fromConfigId
  }
  if (season.providerConfigId != null) {
    return undefined
  }
  const fromProviderTag =
    typeof season.provider === 'string' &&
    season.provider in PROVIDER_TO_BUILTIN_ID
      ? PROVIDER_TO_BUILTIN_ID[season.provider as DanmakuSourceType]
      : undefined
  return resolveBuiltinManifestId(fromProviderTag)
}

const zEpisodeInsertV4WithSeasonV1Preprocessed = z.preprocess((data) => {
  const d = data as { season?: Record<string, unknown> } & Record<
    string,
    unknown
  >
  if (!d?.season || typeof d.season.manifestId === 'string') {
    return data
  }
  const builtinId = recoverBackupManifestId(d.season)
  if (!builtinId) {
    return data
  }
  return {
    ...d,
    season: {
      ...d.season,
      manifestId: builtinId,
      namespaceKey: builtinId,
    },
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

  // try custom v4
  {
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
