import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { CommentBank } from '@mui/icons-material'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SelectDanmaku } from '../SelectDanmaku'
import { ControlBarButton } from './ControlBarButton'

export const SelectDanmakuButton = () => {
  const { t } = useTranslation()
  const { onSelectEpisode } = useVideoPlayer()

  return (
    <ControlBarButton
      buttonId="danmaku-select-button"
      tooltip={t('danmaku.select')}
      menu={{
        content: (
          <Box
            sx={{
              width: 400,
              height: 600,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SelectDanmaku onSelect={onSelectEpisode} />
          </Box>
        ),
      }}
    >
      <CommentBank />
    </ControlBarButton>
  )
}
