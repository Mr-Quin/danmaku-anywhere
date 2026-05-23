import { useEffect, useRef } from 'react'
import { matchRoutes } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { getAncestorPaths } from './getAncestorPaths'
import { POPUP_ROUTE_STORAGE_KEY, router, routes } from './router'

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

  // Restore by walking the URL hierarchy and PUSHing each ancestor on top of
  // /mount, so the in-page back button steps back through the URL tree (e.g.
  // /options/advanced -> back -> /options -> back -> /mount). A loader
  // redirect would REPLACE history and leave back() dead-ending.
  useEffect(() => {
    let cancelled = false
    const storage = getStorageArea('session')
    void (async () => {
      try {
        const data = await storage
          .get(POPUP_ROUTE_STORAGE_KEY)
          .catch(() => null)
        if (cancelled) {
          return
        }
        const persisted = data?.[POPUP_ROUTE_STORAGE_KEY]
        if (
          typeof persisted !== 'string' ||
          persisted === '' ||
          persisted === '/' ||
          persisted === '/mount'
        ) {
          return
        }
        if (!matchRoutes(routes, persisted)) {
          void storage.remove(POPUP_ROUTE_STORAGE_KEY).catch(() => undefined)
          return
        }
        for (const ancestor of getAncestorPaths(persisted, routes)) {
          if (cancelled) {
            return
          }
          await router.navigate(ancestor)
        }
        if (cancelled) {
          return
        }
        restored.current = true
        await router.navigate(persisted)
      } finally {
        restored.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return <RouterProvider router={router} />
}
