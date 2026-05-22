import { useEffect } from 'react'
import { RouterProvider } from 'react-router/dom'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { POPUP_ROUTE_STORAGE_KEY, router } from './router'

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
  return <RouterProvider router={router} />
}
