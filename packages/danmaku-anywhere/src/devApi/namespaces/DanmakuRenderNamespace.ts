import { injectable } from 'inversify'
import { RENDER_LOG_GLOBAL } from '@/content/player/danmakuManager/devRenderLog'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface DanmakuRenderApi {
  rendered(tabId?: number): Promise<string[]>
  waitForRendered(
    text: string,
    tabId?: number,
    timeoutMs?: number
  ): Promise<string[]>
}

const DEFAULT_WAIT_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 100

async function resolveTabId(tabId?: number): Promise<number | undefined> {
  if (tabId !== undefined) {
    return tabId
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id
}

// The player mounts in whichever frame holds the <video>, which is a subframe
// for the iframe integrations, so every frame has to be asked.
async function readLog(tabId: number): Promise<string[]> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'ISOLATED',
      func: (key: string) => {
        return (
          ((globalThis as unknown as Record<string, unknown>)[key] as
            | string[]
            | undefined) ?? []
        )
      },
      args: [RENDER_LOG_GLOBAL],
    })
    return results.flatMap((r) => (r.result as string[] | undefined) ?? [])
  } catch (err) {
    // Swallow tab-gone / no-permission so polling callers can keep retrying.
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('No tab with id') ||
      message.includes('Cannot access') ||
      message.includes('Frame with ID') ||
      message.includes('The tab was closed')
    ) {
      return []
    }
    throw err
  }
}

@injectable('Singleton')
export class DanmakuRenderNamespace implements DevNamespace {
  readonly name = 'danmakuRender'
  readonly description =
    'What the danmaku renderer actually rendered on a tab. Rendered comments despawn as they scroll, so the DOM cannot answer whether a comment was ever rendered; this can.'
  readonly methods: readonly AnyMethodDef[] = [
    defineMethod({
      name: 'rendered',
      description:
        'Texts the renderer has rendered on a tab, oldest first, across all frames. Defaults to the active tab.',
      kind: 'read',
      args: [{ name: 'tabId', type: 'number', optional: true }],
      handler: async (tabId?: number) => {
        const target = await resolveTabId(tabId)
        if (target === undefined) {
          return []
        }
        return readLog(target)
      },
    }),
    defineMethod({
      name: 'waitForRendered',
      description:
        'Poll danmakuRender.rendered() until `text` appears or timeoutMs elapses. Rejects on timeout. Defaults to the active tab.',
      kind: 'read',
      args: [
        { name: 'text', type: 'string' },
        { name: 'tabId', type: 'number', optional: true },
        { name: 'timeoutMs', type: 'number', optional: true },
      ],
      handler: async (text: string, tabId?: number, timeoutMs?: number) => {
        const target = await resolveTabId(tabId)
        if (target === undefined) {
          throw new Error('danmakuRender.waitForRendered: no tab to inspect')
        }
        const budget = timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
        const deadline = Date.now() + budget
        while (Date.now() < deadline) {
          const log = await readLog(target)
          if (log.includes(text)) {
            return log
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }
        throw new Error(
          `danmakuRender.waitForRendered: "${text}" was not rendered on tab ${target} within ${budget}ms`
        )
      },
    }),
  ]
}
