import { useEffect } from 'react'
import { matchRoutes } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { POPUP_ROUTE_STORAGE_KEY, router, routes } from './router'

export const RootRouter = () => {
  useEffect(
    () =>
      router.subscribe((state) => {
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
      const data = await storage.get(POPUP_ROUTE_STORAGE_KEY).catch(() => null)
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
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return <RouterProvider router={router} />
}
