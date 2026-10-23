import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/common/components/Toast/toastStore'
import { isCustomSeason } from '@/common/danmaku/utils'
import { describeError } from '@/common/errors/describeError'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

export function useUpsertSeason() {
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: async (
      input: SeasonOrInsert
    ): Promise<Season | CustomSeason> => {
      // Custom seasons live in customEpisode, not the seasons table.
      if (isCustomSeason(input)) {
        return input
      }
      const res = await chromeRpcClient.seasonUpsert(input)
      return res.data
    },
    meta: {
      invalidates: [seasonQueryKeys.all()],
    },
    onError: (error) => {
      toast.error(describeError(error).message)
    },
  })
}
