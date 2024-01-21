import { usePopup } from '../store/popupStore'
import { useStore } from '../store/store'
import { DanmakuMeta } from '@/common/db'
import { useFetchDanmaku } from '@/popup/hooks/useFetchDanmaku'

export const useFetchAndSetDanmaku = () => {
  const { close } = usePopup()
  const { setComments, setDanmakuMeta } = useStore()

  const props = useFetchDanmaku()

  const { fetch } = props

  const handleFetch = async (danmakuMeta: DanmakuMeta) => {
    setDanmakuMeta(danmakuMeta)

    const res = await fetch({
      data: danmakuMeta,
      options: {
        forceUpdate: false,
      },
    })

    if (!res) return
    setComments(res.comments)
    close()
  }

  return {
    ...props,
    fetch: handleFetch,
  }
}
