import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { Build } from '../builds.js'
import { KIND_LABEL } from '../builds.js'
import { formatAbsolute, formatRelative } from '../format.js'

export type BusyAction = 'downloading' | 'activating' | 'removing'

interface BuildDetailProps {
  build: Build
  busy?: BusyAction
  locked: boolean
  error?: string
  onUse: (tag: string) => void
  onDownload: (tag: string) => void
  onRemove: (tag: string) => void
}

const BUSY_LABEL: Record<BusyAction, string> = {
  downloading: 'Downloading…',
  activating: 'Switching…',
  removing: 'Deleting…',
}

export function BuildDetail({
  build,
  busy,
  locked,
  error,
  onUse,
  onDownload,
  onRemove,
}: BuildDetailProps) {
  const status = build.installed ? 'downloaded' : 'not downloaded'

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="caption" color="text.secondary">
        {KIND_LABEL[build.kind]} · {status}
      </Typography>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {build.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Version {build.version}
        {build.publishedAt ? (
          <span title={formatAbsolute(build.publishedAt)}>
            {' '}
            · built {formatRelative(build.publishedAt)}
          </span>
        ) : null}
        {build.title !== build.tag ? ` · ${build.tag}` : ''}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5 }}>
        <PrimaryAction
          build={build}
          busy={busy}
          locked={locked}
          onUse={onUse}
        />
        {!build.installed ? (
          <Button
            disabled={locked}
            onClick={() => {
              onDownload(build.tag)
            }}
          >
            Download only
          </Button>
        ) : null}
        {build.installed && !build.active ? (
          <Button
            color="error"
            disabled={locked}
            onClick={() => {
              onRemove(build.tag)
            }}
          >
            Delete
          </Button>
        ) : null}
        {busy ? (
          <Typography variant="body2" color="text.secondary">
            {BUSY_LABEL[busy]}
          </Typography>
        ) : null}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {build.notes.length > 0 ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2">What's in it</Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2.5 }}>
            {build.notes.map((note) => (
              <li key={note}>
                <Typography variant="body2" color="text.secondary">
                  {note}
                </Typography>
              </li>
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

interface PrimaryActionProps {
  build: Build
  busy?: BusyAction
  locked: boolean
  onUse: (tag: string) => void
}

function PrimaryAction({ build, busy, locked, onUse }: PrimaryActionProps) {
  if (build.active) {
    return (
      <Chip icon={<CheckCircleOutlineIcon />} label="In use" color="success" />
    )
  }
  return (
    <Button
      variant="contained"
      startIcon={build.installed ? undefined : <DownloadIcon />}
      loading={busy === 'downloading' || busy === 'activating'}
      loadingPosition="start"
      disabled={locked}
      onClick={() => {
        onUse(build.tag)
      }}
    >
      {build.installed ? 'Use' : 'Get and use'}
    </Button>
  )
}
