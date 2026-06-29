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

interface ActiveBannerProps {
  state: PublicState
  onCopyPath: () => void
  onOpenPath: () => void
}

export function ActiveBanner({
  state,
  onCopyPath,
  onOpenPath,
}: ActiveBannerProps) {
  const activeBuild = state.builds.find((b) => b.tag === state.activeTag)

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ display: 'block' }}>
              Active build
            </Typography>
            {state.activeTag ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}
              >
                <Chip label={state.activeTag} color="primary" />
                {activeBuild ? (
                  <Typography variant="caption" color="text.secondary">
                    {activeBuild.version} · {activeBuild.channel}
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                No active build. Download one below, then Set active.
              </Typography>
            )}
          </Box>
          {state.activePath ? (
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Tooltip title="Copy folder path">
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
        </Stack>
        {state.activeTag ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            Load unpacked in chrome://extensions and select this folder once.
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}
