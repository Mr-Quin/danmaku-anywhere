import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { formatRelative } from '../format.js'
import type { CachedBuild } from '../types.js'
import { BuildRowShell } from './BuildRowShell.js'

interface InstalledRowProps {
  build: CachedBuild
  active: boolean
  busy: boolean
  error?: string
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

export function InstalledRow({
  build,
  active,
  busy,
  error,
  onSetActive,
  onRemove,
}: InstalledRowProps) {
  const meta = `${build.version} · downloaded ${formatRelative(build.downloadedAt)}`

  return (
    <BuildRowShell
      tag={build.tag}
      chips={
        <Chip
          label={build.channel}
          size="small"
          color={build.channel === 'preview' ? 'secondary' : 'default'}
        />
      }
      meta={meta}
      error={error}
      actions={
        <>
          {busy ? <CircularProgress size={16} /> : null}
          {active ? (
            <Chip label="Active" color="success" size="small" />
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  onSetActive(build.tag)
                }}
              >
                Set active
              </Button>
              <Tooltip title="Remove">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() => {
                      onRemove(build.tag)
                    }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </>
      }
    />
  )
}
