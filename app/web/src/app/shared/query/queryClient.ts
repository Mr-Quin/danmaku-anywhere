import {
  MutationCache,
  QueryClient,
} from '@tanstack/angular-query-experimental'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
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
  }),
})
