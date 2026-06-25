import type { InitedUniDB } from '@dan-uni/dan-any/core'
import { UniDB } from '@dan-uni/dan-any/core/main/pure'

/**
 * UI-side UniDB factory for parsing danmaku files.
 * Unlike the background service, this creates temporary in-memory instances.
 */
export function createUniDB(): InitedUniDB {
  const udb = new UniDB()
  return udb.init()
}
