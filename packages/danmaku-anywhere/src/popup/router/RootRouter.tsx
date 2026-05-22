import { useEffect, useMemo } from 'react'
import { RouterProvider } from 'react-router/dom'

import { setupRoutePersistence } from './persistRoute'
import { createPopupRouter } from './router'

export const RootRouter = () => {
  const router = useMemo(() => createPopupRouter(), [])
  useEffect(() => setupRoutePersistence(router), [router])
  return <RouterProvider router={router} />
}
