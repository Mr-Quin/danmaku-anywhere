import { MutationCache, QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_, __, ___, mutation) => {
      const {
        options: { mutationKey },
      } = mutation
      // Invalid the query cache when the mutation is successful and has a mutationKey
      if (mutationKey) {
        void queryClient.invalidateQueries({ queryKey: mutationKey })
      }
    },
    onError: (_, __, ___, mutation) => {
      const {
        options: { mutationKey, meta },
      } = mutation
      if (mutationKey && meta?.invalidateOnError) {
        void queryClient.invalidateQueries({ queryKey: mutationKey })
      }
    },
  }),
})
