import CheckIcon from '@mui/icons-material/Check'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatAbsolute, formatRelative } from '../format.js'
import type { Row } from '../types.js'
import { BuildRowShell } from './BuildRowShell.js'

interface BrowseRowProps {
  row: Row
  installed: boolean
  active: boolean
  busy: boolean
  error?: string
  onDownload: (tag: string) => void
}

export function BrowseRow({
  row,
  installed,
  active,
  busy,
  error,
  onDownload,
}: BrowseRowProps) {
  const meta = row.publishedAt ? (
    <span title={formatAbsolute(row.publishedAt)}>
      {row.version} · {formatRelative(row.publishedAt)}
    </span>
  ) : (
    row.version
  )

  return (
    <BuildRowShell
      tag={row.tag}
      chips={
        row.previewSubtype ? (
          <Chip label={row.previewSubtype} color="secondary" size="small" />
        ) : null
      }
      meta={meta}
      error={error}
      actions={
        active ? (
          <Chip label="Active" color="success" size="small" />
        ) : installed ? (
          <Stack
            direction="row"
            spacing={0.25}
            sx={{ alignItems: 'center', color: 'text.secondary' }}
          >
            <CheckIcon fontSize="small" />
            <Typography variant="caption">Installed</Typography>
          </Stack>
        ) : (
          <Button
            size="small"
            variant="contained"
            loading={busy}
            onClick={() => {
              onDownload(row.tag)
            }}
          >
            Download
          </Button>
        )
      }
    />
  )
}
