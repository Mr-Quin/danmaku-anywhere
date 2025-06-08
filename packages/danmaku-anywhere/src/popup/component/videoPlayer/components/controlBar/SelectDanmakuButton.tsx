import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { CommentBank } from '@mui/icons-material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectDanmaku } from '../SelectDanmaku'
import { ControlBarButton } from './ControlBarButton'
import { PopoverPaper } from './PopoverPaper'

export const SelectDanmakuButton = () => {
  const { t } = useTranslation()
  const { onSelectEpisode } = useVideoPlayer()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <ControlBarButton
      tooltip={t('danmaku.select')}
      onClick={() => setMenuOpen(!menuOpen)}
      menu={{
        content: (
          <PopoverPaper
            sx={{
              width: 400,
              height: 600,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SelectDanmaku onSelect={onSelectEpisode} />
          </PopoverPaper>
        ),
      }}
    >
      <CommentBank />
    </ControlBarButton>
  )
}
