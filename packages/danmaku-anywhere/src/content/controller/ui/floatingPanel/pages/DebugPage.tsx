import { ContentCopy } from '@mui/icons-material'
import {
  alpha,
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  styled,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { produce } from 'immer'
import { type ReactNode, useState } from 'react'
import { useDialogStore } from '@/common/components/Dialog/dialogStore'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { FrameState } from '@/content/controller/store/store'
import { useStore } from '@/content/controller/store/store'

// --- Helpers ---

const StatusDot = styled('span')<{ active: boolean }>(({ theme, active }) => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: active
    ? theme.palette.success.main
    : theme.palette.action.disabled,
  flexShrink: 0,
}))

const BoolChip = ({ label, value }: { label: string; value: boolean }) => (
  <Chip
    label={label}
    size="small"
    color={value ? 'success' : 'default'}
    variant={value ? 'filled' : 'outlined'}
    sx={{ height: 20, fontSize: 11 }}
  />
)

const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <TableRow sx={{ '& td': { borderBottom: 'none', py: 0.25, px: 1 } }}>
    <TableCell
      component="th"
      sx={{
        color: 'text.secondary',
        fontSize: 12,
        whiteSpace: 'nowrap',
        width: 1,
      }}
    >
      {label}
    </TableCell>
    <TableCell sx={{ fontSize: 12 }}>{value}</TableCell>
  </TableRow>
)

const FieldTable = ({ children }: { children: ReactNode }) => (
  <Table size="small">
    <TableBody>{children}</TableBody>
  </Table>
)

const SectionHeader = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="overline"
    fontSize={10}
    color="text.secondary"
    px={1}
    pt={1.5}
    pb={0.5}
    display="block"
    letterSpacing={1.5}
  >
    {children}
  </Typography>
)

// --- Frame Card ---

const FrameCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  border: `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: isActive
    ? alpha(theme.palette.primary.main, 0.08)
    : 'transparent',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: isActive
      ? alpha(theme.palette.primary.main, 0.12)
      : theme.palette.action.hover,
  },
}))

const FrameItem = ({
  frame,
  isActive,
  onSelect,
}: {
  frame: FrameState
  isActive: boolean
  onSelect: () => void
}) => (
  <FrameCard isActive={isActive} onClick={onSelect}>
    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
      <StatusDot active={frame.hasVideo} />
      <Typography variant="body2" fontWeight={600} fontSize={12}>
        Frame #{frame.frameId}
      </Typography>
      {isActive && (
        <Chip
          label="Active"
          size="small"
          color="primary"
          sx={{ height: 18, fontSize: 10 }}
        />
      )}
    </Stack>
    <Typography
      variant="caption"
      color="text.secondary"
      noWrap
      display="block"
      title={frame.url}
      fontSize={11}
    >
      {frame.url}
    </Typography>
    <Stack direction="row" spacing={0.5} mt={0.5}>
      <BoolChip label="started" value={frame.started} />
      <BoolChip label="mounted" value={frame.mounted} />
      <BoolChip label="hasVideo" value={frame.hasVideo} />
    </Stack>
  </FrameCard>
)

// --- Tab Panels ---

const FramesPanel = () => {
  const { allFrames, activeFrame, setActiveFrame } = useStore.use.frame()
  const frames = Array.from(allFrames.values())

  return (
    <Box p={1}>
      <SectionHeader>Frames ({frames.length})</SectionHeader>
      {frames.length === 0 ? (
        <Typography variant="body2" color="text.secondary" p={1}>
          No frames detected
        </Typography>
      ) : (
        <Stack spacing={1} p={0.5}>
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
  )
}

const StatePanel = () => {
  const danmaku = useStore.use.danmaku()
  const integration = useStore.use.integration()
  const integrationForm = useStore.use.integrationForm()
  const isDisconnected = useStore.use.isDisconnected()
  const videoId = useStore.use.videoId?.()
  const toastState = useToast()
  const { dialogs, closingIds, loadingIds } = useDialogStore()

  return (
    <Box>
      <SectionHeader>General</SectionHeader>
      <FieldTable>
        <FieldRow
          label="connection"
          value={
            <BoolChip
              label={isDisconnected ? 'Disconnected' : 'Connected'}
              value={!isDisconnected}
            />
          }
        />
        <FieldRow
          label="videoId"
          value={
            <Typography variant="caption" fontFamily="monospace">
              {videoId ?? 'none'}
            </Typography>
          }
        />
      </FieldTable>

      <Divider sx={{ my: 0.5 }} />

      <SectionHeader>Danmaku</SectionHeader>
      <FieldTable>
        <FieldRow
          label="status"
          value={
            <Stack direction="row" spacing={0.5}>
              <BoolChip label="mounted" value={danmaku.isMounted} />
              <BoolChip label="visible" value={danmaku.isVisible} />
              <BoolChip label="manual" value={danmaku.isManual} />
            </Stack>
          }
        />
        <FieldRow label="comments" value={danmaku.comments.length} />
        <FieldRow label="episodes" value={danmaku.episodes?.length ?? 0} />
        <FieldRow
          label="filter"
          value={
            <Typography variant="caption" fontFamily="monospace">
              {danmaku.filter || '(empty)'}
            </Typography>
          }
        />
      </FieldTable>

      <Divider sx={{ my: 0.5 }} />

      <SectionHeader>Integration</SectionHeader>
      <FieldTable>
        <FieldRow
          label="status"
          value={
            <Stack direction="row" spacing={0.5}>
              <BoolChip label="active" value={integration.active} />
              <BoolChip
                label="foundElements"
                value={integration.foundElements}
              />
            </Stack>
          }
        />
        {integration.errorMessage && (
          <FieldRow
            label="error"
            value={
              <Typography variant="caption" color="error.main">
                {integration.errorMessage}
              </Typography>
            }
          />
        )}
        {integration.mediaInfo && (
          <FieldRow
            label="mediaInfo"
            value={integration.mediaInfo.toString()}
          />
        )}
      </FieldTable>

      <Divider sx={{ my: 0.5 }} />

      <SectionHeader>Integration Form</SectionHeader>
      <FieldTable>
        <FieldRow
          label="flags"
          value={
            <Stack direction="row" spacing={0.5}>
              <BoolChip label="editor" value={integrationForm.showEditor} />
              <BoolChip label="aiEditor" value={integrationForm.showAiEditor} />
              <BoolChip label="picking" value={integrationForm.isPicking} />
            </Stack>
          }
        />
      </FieldTable>

      <Divider sx={{ my: 0.5 }} />

      <SectionHeader>Toast / Dialogs</SectionHeader>
      <Box
        component="pre"
        sx={{
          fontSize: 11,
          m: 0,
          px: 1,
          py: 0.5,
          overflow: 'auto',
          fontFamily: 'monospace',
        }}
      >
        {JSON.stringify(toastState, null, 2)}
        {'\n'}
        {JSON.stringify({ dialogs, closingIds, loadingIds }, null, 2)}
      </Box>
    </Box>
  )
}

const OptionsPanel = () => {
  const { data: options } = useExtensionOptions()

  return (
    <Box
      component="pre"
      sx={{
        fontSize: 11,
        m: 0,
        p: 1,
        overflow: 'auto',
        fontFamily: 'monospace',
      }}
    >
      {JSON.stringify(options, null, 2)}
    </Box>
  )
}

// --- Main ---

enum DebugTab {
  Frames = 0,
  State = 1,
  Options = 2,
}

export const DebugPage = () => {
  const [tab, setTab] = useState<DebugTab>(DebugTab.Frames)
  const [copied, setCopied] = useState(false)
  const state = useStore()
  const { data: options } = useExtensionOptions()

  const handleCopyState = () => {
    // biome-ignore lint/suspicious/noExplicitAny: debug page serialization
    const snapshot = produce(state, (draft: any) => {
      delete draft.danmaku.comments
      if (draft.danmaku.episodes) {
        for (const item of draft.danmaku.episodes) {
          if ('comments' in item) {
            delete item.comments
          }
        }
      }
      draft.frame.allFrames = Object.fromEntries(
        draft.frame.allFrames.entries()
      )
      draft.options = options
    })
    void navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <TabLayout>
      <TabToolbar title="Debug">
        <Tooltip title={copied ? 'Copied!' : 'Copy state'}>
          <IconButton size="small" onClick={handleCopyState}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </TabToolbar>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: 12, py: 0 },
        }}
      >
        <Tab label="Frames" />
        <Tab label="State" />
        <Tab label="Options" />
      </Tabs>
      <Divider />

      <Box flexGrow={1} overflow="auto">
        {tab === DebugTab.Frames && <FramesPanel />}
        {tab === DebugTab.State && <StatePanel />}
        {tab === DebugTab.Options && <OptionsPanel />}
      </Box>
    </TabLayout>
  )
}
