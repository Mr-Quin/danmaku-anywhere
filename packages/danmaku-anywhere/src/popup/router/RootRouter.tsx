import { useEffect, useRef } from 'react'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { isDetachedWindow } from '@/popup/utils/isDetachedWindow'
import { getAncestorPaths } from './getAncestorPaths'
import { hasExplicitRoute, resolveRestoreTarget } from './resolveRestoreTarget'
import {
  INITIAL_HASH,
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
    const target = resolveRestoreTarget(
      data?.[POPUP_ROUTE_STORAGE_KEY],
      routes,
      POPUP_DEFAULT_ROUTE
    )
    if (target.kind === 'invalid') {
      void storage.remove(POPUP_ROUTE_STORAGE_KEY).catch(() => undefined)
      return
    }
    if (target.kind === 'none') {
      return
    }
    const ancestors = getAncestorPaths(target.path, routes, POPUP_DEFAULT_ROUTE)
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
    await router.navigate(target.path)
  } finally {
    openGate()
  }
}

export const RootRouter = () => {
  // Gate the persist subscriber so intermediate restore navigations don't
  // overwrite the persisted target.
  const restored = useRef(false)

  useEffect(() => {
    if (isDetachedWindow()) {
      return
    }
    return router.subscribe((state) => {
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
    })
  }, [])

  useEffect(() => {
    if (isDetachedWindow()) {
      return
    }
    if (hasExplicitRoute(INITIAL_HASH)) {
      restored.current = true
      return
    }
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
