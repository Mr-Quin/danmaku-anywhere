import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'

export const MountController = () => {
  const { filter, setIsMounted } = useStore.use.mount()

  const isConnected = useIsConnected()

  const { mutate, isPending: isMounting } = useMountDanmakuPopup()

  const handleMount = async (episode: WithSeason<EpisodeLiteV4>) => {
    mutate(
      { id: episode.id },
      {
        onSuccess: () => {
          setIsMounted(true)
        },
      }
    )
  }

  return (
    <DanmakuSelector
      filter={filter}
      onSelect={handleMount}
      disabled={!isConnected || isMounting}
    />
  )
}
