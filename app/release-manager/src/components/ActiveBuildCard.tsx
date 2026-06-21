import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { PublicState } from '../types.js'

interface ActiveBuildCardProps {
  state: PublicState
  onCopyPath: () => void
  onOpenPath: () => void
}

export function ActiveBuildCard({
  state,
  onCopyPath,
  onOpenPath,
}: ActiveBuildCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" gutterBottom sx={{ display: 'block' }}>
          Active build
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {state.activeTag ? (
            <Chip label={state.activeTag} color="primary" />
          ) : (
            <Typography variant="body2" color="text.secondary">
              none selected
            </Typography>
          )}
        </Stack>
        {state.activePath ? (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', mt: 1 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}
            >
              {state.activePath}
            </Typography>
            <Tooltip title="Copy path">
              <IconButton size="small" onClick={onCopyPath}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open folder">
              <IconButton size="small" onClick={onOpenPath}>
                <FolderOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Load unpacked in chrome://extensions and select this folder once.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
