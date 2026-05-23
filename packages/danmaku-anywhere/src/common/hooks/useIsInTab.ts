import { useSuspenseQuery } from '@tanstack/react-query'

async function detectIsInTab(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.getCurrent) {
    return false
  }
  const tab = await chrome.tabs.getCurrent()
  return tab !== undefined
}

export function useIsInTab(): boolean {
  return useSuspenseQuery({
    queryKey: ['isInTab'],
    queryFn: detectIsInTab,
    staleTime: Number.POSITIVE_INFINITY,
  }).data
}
