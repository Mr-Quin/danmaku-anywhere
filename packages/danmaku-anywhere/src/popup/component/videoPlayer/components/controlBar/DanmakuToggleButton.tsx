import { Subtitles, SubtitlesOff } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

export const DanmakuToggleButton = () => {
  const { t } = useTranslation()
  const { renderer } = useVideoPlayer()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (renderer) {
      setVisible(renderer.isVisible())
    }
  }, [renderer])

  const toggleDanmaku = () => {
    if (renderer) {
      if (renderer.isVisible()) {
        renderer.hide()
        setVisible(false)
      } else {
        renderer.show()
        setVisible(true)
      }
    }
  }

  return (
    <ControlBarButton
      onClick={toggleDanmaku}
      tooltip={visible ? t('danmaku.hide') : t('danmaku.show')}
    >
      {visible ? <Subtitles /> : <SubtitlesOff />}
    </ControlBarButton>
  )
}
