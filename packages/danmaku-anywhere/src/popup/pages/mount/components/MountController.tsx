import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'
import type {
  EpisodeLite,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

export const MountController = () => {
  const { filter, setIsMounted } = useStore.use.mount()

  const isConnected = useIsConnected()

  const { mutate, isPending: isMounting } = useMountDanmakuPopup()

  const handleMount = async (episode: WithSeason<EpisodeLite>) => {
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
