import {
  type KazumiPolicy,
  zKazumiPolicy,
} from '@danmaku-anywhere/danmaku-provider/kazumi'

// Policies are stored as they were parsed at import time, so older ones lack
// fields the schema has gained since, such as searchMode and chapterMode.
export function normalizeStoredPolicy(stored: KazumiPolicy): KazumiPolicy {
  const result = zKazumiPolicy.safeParse(stored)
  if (!result.success) {
    return stored
  }
  return result.data
}
