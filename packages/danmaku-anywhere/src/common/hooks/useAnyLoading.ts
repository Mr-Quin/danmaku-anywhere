import { useIsFetching, useIsMutating } from '@tanstack/react-query'

export const useAnyLoading = () => {
  const isMutating = useIsMutating() > 0
  const isFetching = useIsFetching() > 0

  return isMutating || isFetching
}
