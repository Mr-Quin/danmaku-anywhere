import { useEffect, useRef } from 'react'
import { matchRoutes } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { getAncestorPaths } from './getAncestorPaths'
import {
  POPUP_DEFAULT_ROUTE,
  POPUP_ROUTE_STORAGE_KEY,
  router,
  routes,
} from './router'

// Restore the persisted popup route by walking the URL hierarchy and PUSHing
// each ancestor on top of /mount, so the in-page back button steps back
// through the URL tree (e.g. /options/advanced -> back -> /options -> back
// -> /mount). A loader redirect would REPLACE history and leave back()
// dead-ending. openGate is called immediately before the final navigate so
// the target's settled state is persisted, and again from `finally` so the
// gate also opens on every early-return path.
async function restoreRoute(
  signal: AbortSignal,
  openGate: () => void
): Promise<void> {
  const storage = getStorageArea('session')
  try {
    const data = await storage.get(POPUP_ROUTE_STORAGE_KEY).catch(() => null)
    if (signal.aborted) {
      return
    }
    const persisted = data?.[POPUP_ROUTE_STORAGE_KEY]
    if (
      typeof persisted !== 'string' ||
      persisted === '' ||
      persisted === '/' ||
      persisted === POPUP_DEFAULT_ROUTE
    ) {
      return
    }
    if (!matchRoutes(routes, persisted)) {
      void storage.remove(POPUP_ROUTE_STORAGE_KEY).catch(() => undefined)
      return
    }
    const ancestors = getAncestorPaths(persisted, routes, POPUP_DEFAULT_ROUTE)
    for (const ancestor of ancestors) {
      if (signal.aborted) {
        return
      }
      await router.navigate(ancestor)
    }
    if (signal.aborted) {
      return
    }
    openGate()
    await router.navigate(persisted)
  } finally {
    openGate()
  }
}

export const RootRouter = () => {
  // Gate the persist subscriber until the restore effect is ready. Closed
  // through storage.get and the ancestor walk so intermediate routes never
  // overwrite the target in storage; opened just before the final navigate so
  // the target's settled state is persisted (and so subsequent user-driven
  // navigations resume normal persistence).
  const restored = useRef(false)

  useEffect(
    () =>
      router.subscribe((state) => {
        if (!restored.current) {
          return
        }
        if (state.navigation.state !== 'idle') {
          return
        }
        const { pathname, search, hash } = state.location
        const path = `${pathname}${search}${hash}`
        if (path === '/') {
          return
        }
        void getStorageArea('session').set({
          [POPUP_ROUTE_STORAGE_KEY]: path,
        })
      }),
    []
  )

  useEffect(() => {
    const ac = new AbortController()
    void restoreRoute(ac.signal, () => {
      restored.current = true
    })
    return () => {
      ac.abort()
    }
  }, [])

  return <RouterProvider router={router} />
}
