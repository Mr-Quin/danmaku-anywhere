import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useEnvironment } from '@/content/common/context/Environment'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'
import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'

export const MountController = () => {
  const { filter, setIsMounted } = useStore.use.mount()
  const { selectedTypes } = useStore.use.danmaku()

  const isConnected = useIsConnected()
  const { isPopup } = useEnvironment()

  const { mutate, isPending: isMounting } = useMountDanmakuPopup()

  const handleMount = async (episode: EpisodeLite | CustomEpisodeLite) => {
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
      typeFilter={selectedTypes}
      onSelect={handleMount}
      disabled={!isConnected || isMounting}
      windowVirtualizer={!isPopup}
    />
  )
}
