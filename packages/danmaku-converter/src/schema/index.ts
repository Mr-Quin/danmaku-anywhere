import { type ZodError, z } from 'zod'

import type { CommentEntity } from '../canonical/index.js'
import { zXmlParsedJson } from './genericXml.js'
import { zWevipDanmaku } from './weVip.js'

export * from './genericXml.js'

export const zCombinedDanmaku = z.union([zXmlParsedJson, zWevipDanmaku])

export type CustomImportResult = {
  // indexed
  imported: [number, CommentEntity[]][]
  // array of indices of skipped items and the associated error
  skipped: [number, ZodError][]
}

export const parseCustomDanmaku = (data: unknown[]): CustomImportResult => {
  const imported: [number, CommentEntity[]][] = []
  const skipped: [number, ZodError][] = []

  for (const [i, item] of data.entries()) {
    const parse = zCombinedDanmaku.safeParse(item)
    if (parse.success) {
      imported.push([i, parse.data])
    } else {
      skipped.push([i, parse.error])
    }
  }

  return {
    imported,
    skipped,
  }
}
