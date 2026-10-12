import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { getStorageArea } from '@/common/storage/getStorageArea'

const STORAGE_KEY = 'popup:dismissedBanners'

const queryKey = storageQueryKeys.external('session', STORAGE_KEY)

export function bannerDismissalKey(kind: string, site: string): string {
  return `${kind}@${site}`
}

export function parseDismissals(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

export function useBannerDismissals() {
  const queryClient = useQueryClient()

  const { data: dismissed } = useSuspenseQuery({
    queryKey,
    queryFn: async () => {
      const data = await getStorageArea('session')
        .get(STORAGE_KEY)
        .catch((): Record<string, unknown> => ({}))
      return parseDismissals(data[STORAGE_KEY])
    },
  })

  function isDismissed(key: string): boolean {
    return dismissed.includes(key)
  }

  function dismiss(key: string) {
    if (dismissed.includes(key)) {
      return
    }
    const next = [...dismissed, key]
    queryClient.setQueryData(queryKey, next)
    void getStorageArea('session')
      .set({ [STORAGE_KEY]: next })
      .catch(() => undefined)
  }

  return { isDismissed, dismiss }
}
