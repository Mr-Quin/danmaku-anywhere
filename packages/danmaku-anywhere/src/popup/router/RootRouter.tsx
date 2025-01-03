import { RouterProvider } from 'react-router/dom'

import { router } from './router'

export const RootRouter = () => {
  return <RouterProvider router={router} />
}
