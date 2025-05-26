import { Close, Info } from '@mui/icons-material'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  styled,
} from '@mui/material'
import type { DPlayerOptions } from 'dplayer'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'

const VideoPlayerWrapper = styled('div')(() => {
  return {
    position: 'relative',
    isolation: 'isolate',
    contain: 'layout',
    color: 'white',
  }
})

const TopWrapper = styled('div')<{ in: boolean }>(({ in: inProp, theme }) => {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(2, 4),
    transition: 'opacity 0.3s',
    opacity: inProp ? 1 : 0,
    boxSizing: 'border-box',
  }
})

type DPlayerComponentProps = {
  playerProps: Omit<DPlayerOptions, 'container'> & {
    deps?: unknown[]
  }
  title?: string
  pageUrl?: string
}

export const DPlayerComponent = ({
  playerProps: { videoUrl, picUrl, thumbnailsUrl, deps, ...otherOptions },
  title,
  pageUrl,
}: DPlayerComponentProps) => {
  const playerRef = useRef<HTMLDivElement | null>(null)
  const dpInstanceRef = useRef<DPlayer | null>(null)

  const [hover, setHover] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const handleMouseEnter = () => {
    setHover(true)
  }

  const handleMouseLeave = () => {
    setHover(false)
  }

  const handleOpenInfo = () => {
    setShowInfo(true)
  }

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: DPlayer requires Hls to be globally available
    ;(window as any).Hls = Hls
    const options: DPlayerOptions = {
      container: playerRef.current,
      video: {
        url: videoUrl,
        type: 'auto',
        pic: picUrl,
        thumbnails: thumbnailsUrl,
      },
      ...otherOptions,
    }

    const player = new DPlayer(options)
    dpInstanceRef.current = player

    return () => {
      if (dpInstanceRef.current) {
        player.destroy()
        dpInstanceRef.current = null
      }
    }
  }, [videoUrl, picUrl, thumbnailsUrl, ...(deps ?? [])])

  return (
    <>
      <VideoPlayerWrapper
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <TopWrapper in={hover}>
          <Typography variant="h6">{title}</Typography>
          {videoUrl && (
            <IconButton onClick={handleOpenInfo} disableRipple>
              <Info />
            </IconButton>
          )}
        </TopWrapper>
        <Dialog
          open={showInfo}
          onClose={() => setShowInfo(false)}
          fullWidth
          hideBackdrop
          maxWidth="sm"
          disablePortal
          slotProps={{
            paper: {
              sx: {
                background: 'rgba(0, 0, 0, 0.4)',
              },
            },
          }}
        >
          <DialogTitle>
            Video Info
            <IconButton
              sx={{
                float: 'right',
                p: 0,
              }}
              onClick={() => setShowInfo(false)}
              disableRipple
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {videoUrl && (
              <>
                <Typography>Video URL</Typography>
                <Typography>{videoUrl}</Typography>
              </>
            )}
            {pageUrl && (
              <>
                <Typography>Page url</Typography>
                <Typography>{pageUrl}</Typography>
              </>
            )}
          </DialogContent>
        </Dialog>
        <div ref={playerRef} style={{ width: '100%', height: 'auto' }} />
      </VideoPlayerWrapper>
    </>
  )
}
