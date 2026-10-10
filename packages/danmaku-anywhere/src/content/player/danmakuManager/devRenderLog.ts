import { IS_DA_PROD } from '@/common/constants'

// Rendered comments despawn as they scroll, so a spec that looks at the DOM
// later cannot tell a comment that was never rendered from one that has already
// gone. This records what the renderer actually rendered, which is the question
// the DOM cannot answer.

export const RENDER_LOG_GLOBAL = '__daRenderLog' as const

declare global {
  var __daRenderLog: string[] | undefined
}

// Long enough for a seeded fixture batch, small enough that a real session
// cannot grow it without bound.
const MAX_ENTRIES = 200

export function recordRenderedComment(text: string): void {
  if (IS_DA_PROD) {
    return
  }
  const log = globalThis.__daRenderLog ?? []
  log.push(text)
  globalThis.__daRenderLog = log.slice(-MAX_ENTRIES)
}
