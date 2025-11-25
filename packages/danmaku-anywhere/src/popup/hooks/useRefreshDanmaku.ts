import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

export const useRefreshDanmaku = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const mutation = useFetchDanmaku()

  const refreshDanmaku = async (episode: WithSeason<EpisodeMeta>) => {
    return await mutation.mutateAsync(
      {
        type: 'by-meta',
        meta: episode,
        options: {
          forceUpdate: true,
        },
      },
      {
        onSuccess: (result) => {
          toast.success(
            t('danmaku.alert.refreshed', {
              name: `${episode.season.title} - ${episode.title}`,
              count: result.commentCount,
            })
          )
        },
      }
    )
  }

  return {
    ...mutation,
    refreshDanmaku,
  }
}
