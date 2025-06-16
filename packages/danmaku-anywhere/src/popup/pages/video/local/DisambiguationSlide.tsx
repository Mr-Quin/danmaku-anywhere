import { SeasonGrid } from '@/common/components/MediaList/components/SeasonGrid'
import { isNotCustom } from '@/common/danmaku/utils'
import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { VideoPopoverSurface } from '@/popup/component/videoPlayer/components/VideoPopoverSurface'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { ChevronRight } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'
import { Box, Fade, IconButton, Slide, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DisambiguationSelectorProps {
  seasons: Season[]
  title: string
  onApply: (season: Season) => void
  onClose?: () => void
  isLoading?: boolean
}

export const DisambiguationSelector = ({
  seasons,
  title,
  onApply,
  onClose,
}: DisambiguationSelectorProps) => {
  const { t } = useTranslation()

  if (seasons.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="h6">{t('selectorPage.noAnimeFound')}</Typography>
      </Box>
    )
  }

  return (
    <Box p={2} height={1}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="body1">
          {t('selectorPage.selectAnime', { name: title })}
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
      <SeasonGrid
        data={seasons}
        onSeasonClick={(season) => {
          if (isNotCustom(season)) {
            onApply(season)
          }
        }}
        disableMenu
      />
    </Box>
  )
}

type DisambiguationSlideProps = {
  hasDisambiguation: boolean
} & DisambiguationSelectorProps

export const DisambiguationSlide = ({
  hasDisambiguation,
  ...rest
}: DisambiguationSlideProps) => {
  const [open, setOpen] = useState(hasDisambiguation)
  const [showOpener, setShowOpener] = useState(false)
  const { isHovering, size } = useVideoPlayer()

  useEffect(() => {
    setOpen(hasDisambiguation)
  }, [hasDisambiguation])

  const renderOpener = () => {
    if (hasDisambiguation && showOpener) {
      return (
        <Fade in={isHovering} unmountOnExit mountOnEnter>
          <Box
            height={size[1]}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <VideoPopoverSurface sx={{ borderRadius: 0 }}>
              <IconButton
                onClick={() => {
                  setShowOpener(false)
                  setOpen(true)
                }}
                disableRipple
              >
                <ChevronRight />
              </IconButton>
            </VideoPopoverSurface>
          </Box>
        </Fade>
      )
    }
  }

  return (
    <>
      {renderOpener()}
      <Slide
        in={open}
        direction="right"
        mountOnEnter
        unmountOnExit
        onExited={() => setShowOpener(true)}
      >
        <Box p={2} height={size[1]}>
          <VideoPopoverSurface
            sx={{
              width: 400,
              overflow: 'auto',
              height: 1,
              borderRadius: 1,
            }}
          >
            <DisambiguationSelector {...rest} onClose={() => setOpen(false)} />
          </VideoPopoverSurface>
        </Box>
      </Slide>
    </>
  )
}
