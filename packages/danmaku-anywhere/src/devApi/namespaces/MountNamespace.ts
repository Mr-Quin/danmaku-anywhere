import { injectable } from 'inversify'
import type { MountMirror } from '@/content/controller/common/devMountMirror'
import { MOUNT_MIRROR_GLOBAL } from '@/content/controller/common/devMountMirror'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export type { MountMirror }

export interface MountApi {
  current(tabId?: number): Promise<MountMirror | undefined>
  waitForMount(tabId?: number, timeoutMs?: number): Promise<MountMirror>
  waitForRegistration(pattern: string, timeoutMs?: number): Promise<void>
}

const DEFAULT_WAIT_TIMEOUT_MS = 10_000
const POLL_INTERVAL_MS = 100
const CONTENT_SCRIPT_ID = 'main-content'

async function resolveTabId(tabId?: number): Promise<number | undefined> {
  if (tabId !== undefined) {
    return tabId
  }
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })
  return tab?.id
}

// Reads the controller's mirror global. Returns undefined if the controller
// content script hasn't loaded (no mount config matches the tab URL) or if the
// tab no longer exists. Other executeScript failures propagate.
async function readMirror(tabId: number): Promise<MountMirror | undefined> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      // The injected function name is referenced by string; the global symbol
      // must match MOUNT_MIRROR_GLOBAL.
      func: (key: string) => {
        return (globalThis as unknown as Record<string, unknown>)[key] as
          | MountMirror
          | undefined
      },
      args: [MOUNT_MIRROR_GLOBAL],
    })
    return results[0]?.result ?? undefined
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Tab closed mid-call or no permission for this URL — treat as "nothing
    // mounted" rather than propagating, so polling callers can keep retrying.
    if (
      message.includes('No tab with id') ||
      message.includes('Cannot access') ||
      message.includes('Frame with ID') ||
      message.includes('The tab was closed')
    ) {
      return undefined
    }
    throw err
  }
}

@injectable('Singleton')
export class MountNamespace implements DevNamespace {
  readonly name = 'mount'
  readonly description =
    'Inspect what danmaku is currently mounted on a tab (read from the controller content script)'
  readonly methods: readonly AnyMethodDef[] = [
    defineMethod({
      name: 'current',
      description:
        'Snapshot of the controller mount mirror for a tab. Returns undefined if the controller is not running on that tab. Defaults to the active tab.',
      kind: 'read',
      args: [{ name: 'tabId', type: 'number', optional: true }],
      handler: async (tabId?: number) => {
        const target = await resolveTabId(tabId)
        if (target === undefined) {
          return undefined
        }
        return readMirror(target)
      },
    }),
    defineMethod({
      name: 'waitForMount',
      description:
        'Poll mount.current() until isMounted is true or timeoutMs elapses. Rejects on timeout. Defaults to the active tab.',
      kind: 'read',
      args: [
        { name: 'tabId', type: 'number', optional: true },
        { name: 'timeoutMs', type: 'number', optional: true },
      ],
      handler: async (tabId?: number, timeoutMs?: number) => {
        const target = await resolveTabId(tabId)
        if (target === undefined) {
          throw new Error('mount.waitForMount: no tab to inspect')
        }
        const deadline = Date.now() + (timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS)
        // Poll rather than subscribe — the mirror lives in the content
        // script's globalThis, not in the SW, so there's nothing to observe
        // from here.
        while (Date.now() < deadline) {
          const mirror = await readMirror(target)
          if (mirror?.isMounted) {
            return mirror
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }
        throw new Error(
          `mount.waitForMount: tab ${target} did not reach isMounted=true within ${timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS}ms`
        )
      },
    }),
    defineMethod({
      name: 'waitForRegistration',
      description:
        'Poll until the controller content script is registered for `pattern`. Lets seed helpers wait out the async propagation from storage write → MountConfigService.onChange → scripting.registerContentScripts.',
      kind: 'read',
      args: [
        { name: 'pattern', type: 'string' },
        { name: 'timeoutMs', type: 'number', optional: true },
      ],
      handler: async (pattern: string, timeoutMs?: number) => {
        const deadline = Date.now() + (timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS)
        while (Date.now() < deadline) {
          const scripts = await chrome.scripting.getRegisteredContentScripts({
            ids: [CONTENT_SCRIPT_ID],
          })
          if (scripts[0]?.matches?.includes(pattern)) {
            return
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }
        throw new Error(
          `mount.waitForRegistration: pattern '${pattern}' was not registered within ${timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS}ms`
        )
      },
    }),
  ]
}
