import { useMutation, useQueryClient } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { useAllDanmakuQuery } from '@/popup/hooks/useAllDanmakuQuery'

export const useFetchDanmakuMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: danmakuMessage.fetch,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuery.queryKey,
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
