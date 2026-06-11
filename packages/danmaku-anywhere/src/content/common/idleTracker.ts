export interface IdleTrackerOptions {
  idleMs?: number
  /**
   * Optional filter for activity events. When provided, only events
   * accepted by the filter reset the idle timer. Useful when listening
   * on a broad target like `document` while gating activity to a
   * subtree (e.g. the video element and its overlay siblings).
   */
  shouldCount?: (event: Event) => boolean
}

export interface IdleTracker {
  subscribe(listener: (active: boolean) => void): () => void
  getActive(): boolean
  destroy(): void
}

const DEFAULT_IDLE_MS = 3000

export function createIdleTracker(
  target: HTMLElement | Document | Window,
  options: IdleTrackerOptions = {}
): IdleTracker {
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS
  const listeners = new Set<(active: boolean) => void>()
  let active = true
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  function setActive(next: boolean) {
    if (active === next) {
      return
    }
    active = next
    for (const listener of listeners) {
      listener(next)
    }
  }

  function onActivity(event: Event) {
    if (options.shouldCount && !options.shouldCount(event)) {
      return
    }
    setActive(true)
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => setActive(false), idleMs)
  }

  target.addEventListener('mousemove', onActivity as EventListener)
  target.addEventListener(
    'touchmove',
    onActivity as EventListener,
    {
      capture: true,
      passive: true,
    } as AddEventListenerOptions
  )
  // Stay active until the first activity arrives. Arming the idle timer here
  // would hide the consumer a few seconds after load even if the user never
  // interacted, which removes the only entry point on touch devices.

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getActive() {
      return active
    },
    destroy() {
      clearTimeout(timeoutId)
      target.removeEventListener('mousemove', onActivity as EventListener)
      target.removeEventListener(
        'touchmove',
        onActivity as EventListener,
        {
          capture: true,
        } as EventListenerOptions
      )
      listeners.clear()
    },
  }
}
