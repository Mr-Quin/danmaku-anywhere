import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { PublicState, Row } from '../types.js'

interface ReleaseRowProps {
  row: Row
  state: PublicState
  busy: boolean
  error?: string
  onDownload: (tag: string) => void
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function ReleaseRow({
  row,
  state,
  busy,
  error,
  onDownload,
  onSetActive,
  onRemove,
}: ReleaseRowProps) {
  const cached = state.builds.some((b) => b.tag === row.tag)
  const isActive = state.activeTag === row.tag

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
          >
            {row.tag}
          </Typography>
          {row.previewSubtype ? (
            <Chip label={row.previewSubtype} color="secondary" size="small" />
          ) : null}
          <Typography variant="caption" color="text.secondary">
            {row.version}
          </Typography>
          {row.publishedAt ? (
            <Typography variant="caption" color="text.secondary">
              {formatDate(row.publishedAt)}
            </Typography>
          ) : null}
        </Stack>
        {error ? (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {error}
          </Typography>
        ) : null}
      </Box>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', flexShrink: 0 }}
      >
        {busy ? <CircularProgress size={16} /> : null}
        {isActive ? (
          <Chip label="Active" color="success" size="small" />
        ) : cached ? (
          <>
            <Button
              size="small"
              variant="outlined"
              disabled={busy}
              onClick={() => {
                onSetActive(row.tag)
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
                    onRemove(row.tag)
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ) : (
          <Button
            size="small"
            variant="contained"
            disabled={busy}
            onClick={() => {
              onDownload(row.tag)
            }}
          >
            Download
          </Button>
        )}
      </Stack>
    </Box>
  )
}
