import { useEffect, useRef } from 'react'
import { matchRoutes } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { POPUP_ROUTE_STORAGE_KEY, router, routes } from './router'

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

  // Restore as a PUSH on top of the initial /mount entry so the in-page
  // back button has somewhere to return to. Using a loader redirect here
  // would REPLACE history and leave back() dead-ending.
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
        void router.navigate(persisted)
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
