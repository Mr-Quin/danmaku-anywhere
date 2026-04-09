import type { QueryKey } from '@tanstack/react-query'
import { MutationCache, QueryClient } from '@tanstack/react-query'

interface MutationMeta {
  /** Query keys to invalidate on success (and on error when invalidateOnError is true) */
  invalidates?: QueryKey[]
  /** Whether to also invalidate on error */
  invalidateOnError?: boolean
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: MutationMeta
  }
}

function invalidateKeys(keys: QueryKey[]) {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey })
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_, __, ___, mutation) => {
      const meta = mutation.options.meta as MutationMeta | undefined
      if (meta?.invalidates) {
        invalidateKeys(meta.invalidates)
      }
    },
    onError: (_, __, ___, mutation) => {
      const meta = mutation.options.meta as MutationMeta | undefined
      if (meta?.invalidates && meta.invalidateOnError) {
        invalidateKeys(meta.invalidates)
      }
    },
  }),
})
