import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { matchesQuery } from '../search.js'
import type { CachedBuild } from '../types.js'
import { InstalledRow } from './InstalledRow.js'

interface InstalledCardProps {
  builds: CachedBuild[]
  activeTag?: string
  busyTag?: string
  query: string
  rowErrors: Record<string, string>
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

export function InstalledCard({
  builds,
  activeTag,
  busyTag,
  query,
  rowErrors,
  onSetActive,
  onRemove,
}: InstalledCardProps) {
  const shown = builds.filter((b) => matchesQuery(query, b.tag, b.version))
  const filtering = query.trim().length > 0

  return (
    <Card>
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Typography variant="overline">Installed ({builds.length})</Typography>
      </Box>
      {shown.length === 0 ? (
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {filtering
              ? 'No installed builds match.'
              : 'No builds downloaded yet. Download one from Browse below.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          {shown.map((build) => (
            <InstalledRow
              key={build.tag}
              build={build}
              active={activeTag === build.tag}
              busy={busyTag === build.tag}
              error={rowErrors[build.tag]}
              onSetActive={onSetActive}
              onRemove={onRemove}
            />
          ))}
        </Box>
      )}
    </Card>
  )
}
