import {
  BugReport as BugReportIcon,
  Extension as ExtensionIcon,
  KeyboardArrowDown,
  KeyboardArrowRight,
  PlayCircleOutline as PlayIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material'
import {
  alpha,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Stack,
  styled,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { FrameState } from '@/content/controller/store/store'
import { useStore } from '@/content/controller/store/store'
import { StatusDot } from './DebugShared'

const FrameCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: isActive
    ? alpha(theme.palette.primary.main, 0.04)
    : 'transparent',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: isActive
      ? alpha(theme.palette.primary.main, 0.08)
      : theme.palette.action.hover,
  },
}))

const VideoInfoRow = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <Typography
    variant="caption"
    sx={{
      display: 'block',
      color: 'text.secondary',
      fontSize: 10,
    }}
  >
    <strong style={{ opacity: 0.7 }}>{label}:</strong> {children}
  </Typography>
)

const FrameItem = ({
  frame,
  isActive,
  onSelect,
}: {
  frame: FrameState
  isActive: boolean
  onSelect: () => void
}) => {
  const [expanded, setExpanded] = useState(isActive)
  const debugShowSkipButton = useStore.use.debugShowSkipButton()

  return (
    <FrameCard isActive={isActive}>
      {/* Header Row */}
      <Stack
        direction="row"
        spacing={1}
        onClick={() => setExpanded(!expanded)}
        sx={{
          alignItems: 'center',
          px: 1,
          py: 0.75,
          cursor: 'pointer',
        }}
      >
        <IconButton size="small" sx={{ p: 0.25, ml: -0.5 }}>
          {expanded ? (
            <KeyboardArrowDown fontSize="small" />
          ) : (
            <KeyboardArrowRight fontSize="small" />
          )}
        </IconButton>
        <StatusDot active={frame.hasVideo} />
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontWeight: isActive ? 600 : 400,
            fontSize: 12,
            flexGrow: 1,
          }}
        >
          Frame #{frame.frameId}
        </Typography>
        {isActive ? (
          <Chip
            label="Active"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 16, fontSize: 9, p: 0 }}
          />
        ) : (
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            sx={{ minWidth: 0, py: 0, px: 1, fontSize: 10, lineHeight: 1.5 }}
          >
            Activate
          </Button>
        )}
      </Stack>
      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Box
          sx={{
            px: 3.5,
            pb: 1.5,
            pt: 0,
          }}
        >
          <Typography
            variant="caption"
            component="div"
            noWrap
            title={frame.url}
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              mb: 1,
              userSelect: 'all',
            }}
          >
            {frame.url}
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              mb: 1.5,
              mt: 0.5,
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <PlayIcon
                sx={{
                  fontSize: 14,
                  color: frame.started ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                color={frame.started ? 'text.primary' : 'text.secondary'}
                sx={{
                  fontSize: 10,
                }}
              >
                Started
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <ExtensionIcon
                sx={{
                  fontSize: 14,
                  color: frame.mounted ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                color={frame.mounted ? 'text.primary' : 'text.secondary'}
                sx={{
                  fontSize: 10,
                }}
              >
                Mounted
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <VideocamIcon
                sx={{
                  fontSize: 14,
                  color: frame.hasVideo ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                color={frame.hasVideo ? 'text.primary' : 'text.secondary'}
                sx={{
                  fontSize: 10,
                }}
              >
                Has Video
              </Typography>
            </Stack>
          </Stack>

          {frame.videoInfo && (
            <Box
              sx={{
                mb: 1,
                p: 0.75,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <VideoInfoRow label="src">
                <span title={frame.videoInfo.src} style={{ userSelect: 'all' }}>
                  {frame.videoInfo.src}
                </span>
              </VideoInfoRow>
              <VideoInfoRow label="size">
                {frame.videoInfo.width}x{frame.videoInfo.height}
              </VideoInfoRow>
              <VideoInfoRow label="state">
                {frame.videoInfo.playing ? 'playing' : 'paused'}
                {' · '}
                {frame.videoInfo.muted ? 'muted' : 'unmuted'}
              </VideoInfoRow>
              <VideoInfoRow label="changes">
                {frame.videoChangeCount}
              </VideoInfoRow>
            </Box>
          )}

          {/* Frame Actions/Commands */}
          {frame.hasVideo && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 1,
              }}
            >
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<BugReportIcon fontSize="small" />}
                sx={{ fontSize: 10, py: 0.25, textTransform: 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  debugShowSkipButton(frame.frameId)
                }}
              >
                Trigger Skip Button
              </Button>
            </Stack>
          )}
        </Box>
      </Collapse>
    </FrameCard>
  )
}

export const FramesPanel = () => {
  const { allFrames, activeFrame, setActiveFrame } = useStore.use.frame()
  const frames = [...allFrames.values()]

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="caption"
          color="primary"
          sx={{
            fontWeight: 'bold',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Detected Frames ({frames.length})
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        {frames.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              p: 2,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            No frames detected
          </Typography>
        ) : (
          <Stack>
            {frames.map((frame) => (
              <FrameItem
                key={frame.frameId}
                frame={frame}
                isActive={frame.frameId === activeFrame?.frameId}
                onSelect={() => setActiveFrame(frame.frameId)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
