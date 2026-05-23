import { useEffect, useRef } from 'react'
import { matchRoutes } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { POPUP_ROUTE_STORAGE_KEY, router, routes } from './router'

// Walk the URL hierarchy of `target` and return the intermediate paths that
// resolve to real routes, excluding /mount (the initial entry) and the target
// itself. e.g. '/options/advanced' -> ['/options']; '/styles' -> [].
function getAncestorPaths(target: string): string[] {
  const segments = target.split('/').filter(Boolean)
  const paths: string[] = []
  let current = ''
  for (const seg of segments) {
    current += `/${seg}`
    if (current === target || current === '/mount') {
      continue
    }
    if (matchRoutes(routes, current)) {
      paths.push(current)
    }
  }
  return paths
}

export const RootRouter = () => {
  // Gate the persist subscriber until the restore effect has read storage.
  // Without this, the initial /mount redirect's settled navigation can write
  // '/mount' to storage before storage.get resolves, clobbering the persisted
  // route the user is supposed to be restored to.
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
        restored.current = true
        for (const ancestor of getAncestorPaths(persisted)) {
          if (cancelled) {
            return
          }
          await router.navigate(ancestor)
        }
        if (cancelled) {
          return
        }
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
