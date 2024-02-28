import { use } from 'react'

import { getActiveTab } from '@/common/utils'

// call the function before any components render to "prefetch" the data
const activeTabPromise = (async () => {
  const tab = await getActiveTab()
  if (!tab.url) throw new Error('No active tab')

  return tab
})()

export const useTabUrl = () => {
  return use(activeTabPromise).url!
}
