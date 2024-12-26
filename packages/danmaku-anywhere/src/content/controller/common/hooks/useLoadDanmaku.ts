import { useMutation } from '@tanstack/react-query'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useStore } from '@/content/controller/store/store'

// Wrapper around useFetchDanmaku to load danmaku and update the store
export const useLoadDanmaku = () => {
  const { setComments, setDanmakuLite } = useStore()
  const toast = useToast.use.toast()

  const fetchMutation = useFetchDanmaku()

  const load = async (data: DanmakuFetchDto) => {
    const res = await fetchMutation.mutateAsync(data, {
      onSuccess: (cache) => {
        setDanmakuLite(cache)
        setComments(cache.comments)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })

    return res
  }

  return useMutation({
    mutationFn: load,
  })
}
