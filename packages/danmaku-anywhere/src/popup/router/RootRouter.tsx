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

// PUSH each ancestor of the persisted route on top of /mount so back walks
// through them instead of dead-ending. openGate fires before the final
// navigate (so its settled state persists) and again in finally (so
// early-return paths still resume persistence).
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
  // Gate the persist subscriber so intermediate restore navigations don't
  // overwrite the persisted target.
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
