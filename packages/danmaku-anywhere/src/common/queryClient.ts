import { MutationCache, QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
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
