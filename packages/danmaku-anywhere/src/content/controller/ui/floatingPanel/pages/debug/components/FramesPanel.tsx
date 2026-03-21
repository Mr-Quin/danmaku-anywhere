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
    display="block"
    color="text.secondary"
    fontSize={10}
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
        alignItems="center"
        px={1}
        py={0.75}
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
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
          fontWeight={isActive ? 600 : 400}
          fontSize={12}
          sx={{ flexGrow: 1 }}
          noWrap
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
        <Box px={3.5} pb={1.5} pt={0}>
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            noWrap
            title={frame.url}
            fontSize={11}
            mb={1}
            sx={{ userSelect: 'all' }}
          >
            {frame.url}
          </Typography>

          <Stack direction="row" spacing={1.5} mb={1.5} mt={0.5}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlayIcon
                sx={{
                  fontSize: 14,
                  color: frame.started ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                fontSize={10}
                color={frame.started ? 'text.primary' : 'text.secondary'}
              >
                Started
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ExtensionIcon
                sx={{
                  fontSize: 14,
                  color: frame.mounted ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                fontSize={10}
                color={frame.mounted ? 'text.primary' : 'text.secondary'}
              >
                Mounted
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <VideocamIcon
                sx={{
                  fontSize: 14,
                  color: frame.hasVideo ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography
                variant="caption"
                fontSize={10}
                color={frame.hasVideo ? 'text.primary' : 'text.secondary'}
              >
                Has Video
              </Typography>
            </Stack>
          </Stack>

          {frame.videoInfo && (
            <Box
              mb={1}
              p={0.75}
              bgcolor={(theme) => alpha(theme.palette.text.primary, 0.03)}
              borderRadius={1}
              border={(theme) => `1px solid ${theme.palette.divider}`}
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
            <Stack direction="row" spacing={1} mt={1}>
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
    <Box display="flex" flexDirection="column" height="100%">
      <Box
        px={1}
        py={0.5}
        bgcolor={(theme) => alpha(theme.palette.primary.main, 0.05)}
        borderBottom={(theme) => `1px solid ${theme.palette.divider}`}
      >
        <Typography
          variant="caption"
          fontWeight="bold"
          color="primary"
          letterSpacing={0.5}
          textTransform="uppercase"
        >
          Detected Frames ({frames.length})
        </Typography>
      </Box>
      <Box flex={1} overflow="auto">
        {frames.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            p={2}
            textAlign="center"
            fontStyle="italic"
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
