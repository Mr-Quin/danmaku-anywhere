import type { CustomEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { AutoFixHigh, Check, Close } from '@mui/icons-material'
import {
  Autocomplete,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import type { LocalMatchingRule } from '@/common/options/localMatchingRule/schema'
import {
  localMatchingRuleSchema,
  patternToRegex,
} from '@/common/options/localMatchingRule/schema'

const FormGrid = styled(Box)(({ theme }) => {
  return {
    display: 'grid',
    gridTemplateColumns: '1fr',
    rowGap: theme.spacing(2),
    padding: theme.spacing(0, 2),
  }
})

const ROOT_FOLDER = ''

function extractFolderPaths(episodes: CustomEpisodeLite[]): string[] {
  const folders = new Set<string>()
  for (const ep of episodes) {
    const parts = ep.title.split('/').filter(Boolean)
    parts.pop() // remove filename
    if (parts.length > 0) {
      for (let i = 1; i <= parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'))
      }
    }
  }
  return [ROOT_FOLDER, ...Array.from(folders).sort()]
}

function getFilesInFolder(
  episodes: CustomEpisodeLite[],
  folder: string
): { fileName: string; fullPath: string }[] {
  return episodes
    .filter((ep) => {
      const parts = ep.title.split('/').filter(Boolean)
      parts.pop()
      const epFolder = parts.join('/')
      return epFolder === folder
    })
    .map((ep) => {
      const parts = ep.title.split('/').filter(Boolean)
      const fileName = parts[parts.length - 1]
      return { fileName, fullPath: ep.title }
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
}

function composePattern(folder: string, template: string): string {
  if (folder === ROOT_FOLDER) {
    return template
  }
  return `${folder}/${template}`
}

function decomposePattern(
  pattern: string,
  folderPaths: string[]
): { folder: string; template: string } {
  // Try to find the longest matching folder prefix
  const sortedByLength = [...folderPaths]
    .filter((f) => f !== ROOT_FOLDER)
    .sort((a, b) => b.length - a.length)

  for (const folder of sortedByLength) {
    const prefix = `${folder}/`
    if (pattern.startsWith(prefix)) {
      return { folder, template: pattern.slice(prefix.length) }
    }
  }
  return { folder: ROOT_FOLDER, template: pattern }
}

type FileMatch = {
  fileName: string
  fullPath: string
  episodeNumber: number | null
}

/**
 * Match files against the template using reverse-matching (regex extraction).
 * Returns each file with its matched episode number (or null if no match).
 */
function matchFilesWithTemplate(
  files: { fileName: string; fullPath: string }[],
  template: string
): FileMatch[] {
  const regex = patternToRegex(template)

  return files.map((file) => {
    if (!regex) {
      return { ...file, episodeNumber: null }
    }
    const match = file.fileName.match(regex)
    if (match?.[1]) {
      return { ...file, episodeNumber: Number.parseInt(match[1], 10) }
    }
    return { ...file, episodeNumber: null }
  })
}

/**
 * Auto-detect a filename template from a list of filenames.
 *
 * Finds the longest common prefix and suffix across all filenames,
 * then uses the varying middle part to determine the episode placeholder format.
 *
 * Returns null if detection fails (fewer than 2 files, or no numeric variation found).
 */
function detectPatternFromFiles(files: { fileName: string }[]): string | null {
  if (files.length < 2) {
    return null
  }

  const names = files.map((f) => f.fileName)

  // Find longest common prefix
  let prefix = ''
  const first = names[0]
  for (let i = 0; i < first.length; i++) {
    const ch = first[i]
    if (names.every((n) => n[i] === ch)) {
      prefix += ch
    } else {
      break
    }
  }

  // Find longest common suffix (excluding the prefix part)
  const reversed = names.map((n) =>
    n.slice(prefix.length).split('').reverse().join('')
  )
  let suffixReversed = ''
  const firstRev = reversed[0]
  for (let i = 0; i < firstRev.length; i++) {
    const ch = firstRev[i]
    if (reversed.every((n) => n[i] === ch)) {
      suffixReversed += ch
    } else {
      break
    }
  }
  const suffix = suffixReversed.split('').reverse().join('')

  // Extract the varying middle parts
  const middles = names.map((n) => {
    return n.slice(prefix.length, n.length - suffix.length)
  })

  // All middle parts should be numeric
  if (!middles.every((m) => /^\d+$/.test(m))) {
    return null
  }

  // Determine padding width (consistent digit count = zero-padded)
  const digitWidths = middles.map((m) => m.length)
  const allSameWidth = digitWidths.every((w) => w === digitWidths[0])
  const hasLeadingZeros = middles.some((m) => m.length > 1 && m.startsWith('0'))

  if (allSameWidth && hasLeadingZeros) {
    return `${prefix}{episode:0${digitWidths[0]}d}${suffix}`
  }
  return `${prefix}{episode}${suffix}`
}

type LocalMatchingRuleDetailsProps = {
  rule?: LocalMatchingRule
  initialMapKey?: string
  onSave: (rule: LocalMatchingRule) => void
  onDelete?: (mapKey: string) => void
}

export const LocalMatchingRuleDetails = ({
  rule,
  initialMapKey,
  onSave,
  onDelete,
}: LocalMatchingRuleDetailsProps) => {
  const { t } = useTranslation()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })

  const folderPaths = useMemo(
    () => extractFolderPaths(customEpisodes),
    [customEpisodes]
  )

  const initialDecomposed = rule
    ? decomposePattern(rule.pattern, folderPaths)
    : { folder: ROOT_FOLDER, template: '' }

  const [mapKey, setMapKey] = useState(rule?.mapKey ?? initialMapKey ?? '')
  const [folder, setFolder] = useState(initialDecomposed.folder)
  const [template, setTemplate] = useState(initialDecomposed.template)
  const [errors, setErrors] = useState<{ mapKey?: string; pattern?: string }>(
    {}
  )

  const isEditing = rule !== undefined
  const pattern = composePattern(folder, template)

  const filesInFolder = useMemo(
    () => getFilesInFolder(customEpisodes, folder),
    [customEpisodes, folder]
  )

  const fileMatches = useMemo(
    () => matchFilesWithTemplate(filesInFolder, template),
    [filesInFolder, template]
  )

  const matchCount = fileMatches.filter((f) => f.episodeNumber !== null).length

  const handleSave = () => {
    const result = localMatchingRuleSchema.safeParse({
      mapKey,
      pattern,
    })
    if (!result.success) {
      const fieldErrors: { mapKey?: string; pattern?: string } = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        fieldErrors[field as keyof typeof fieldErrors] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    onSave(result.data)
  }

  const handleAutoDetect = () => {
    const detected = detectPatternFromFiles(filesInFolder)
    if (detected) {
      setTemplate(detected)
    }
  }

  const canAutoDetect = filesInFolder.length >= 2

  return (
    <FormGrid>
      <TextField
        label={t('localMatchingRule.mapKey', 'Media Key')}
        value={mapKey}
        onChange={(e) => setMapKey(e.target.value)}
        error={!!errors.mapKey}
        helperText={
          errors.mapKey ||
          t(
            'localMatchingRule.mapKeyHelp',
            'The title key detected from the video page, e.g. "Attack on Titan" or "Attack on Titan%%S2"'
          )
        }
        size="small"
        fullWidth
        disabled={isEditing}
      />
      <Autocomplete
        options={folderPaths}
        value={folder}
        onChange={(_, newValue) => setFolder(newValue ?? ROOT_FOLDER)}
        getOptionLabel={(option) =>
          option === ROOT_FOLDER
            ? t('localMatchingRule.rootFolder', '(root)')
            : option
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('localMatchingRule.folder', 'Folder')}
            size="small"
            fullWidth
          />
        )}
        disableClearable
        slotProps={{
          popper: {
            sx: { zIndex: 1403 },
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label={t('localMatchingRule.template', 'Filename Template')}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          error={!!errors.pattern}
          helperText={
            errors.pattern ||
            t(
              'localMatchingRule.templateHelp',
              'Use {episode} for episode number, {episode:02d} for zero-padded. Example: {episode:03d}.xml'
            )
          }
          size="small"
          fullWidth
          slotProps={{
            input: {
              sx: { fontFamily: 'monospace' },
            },
          }}
        />
        {canAutoDetect && (
          <Tooltip
            title={t(
              'localMatchingRule.autoDetect',
              'Auto-detect pattern from files'
            )}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={handleAutoDetect}
              sx={{ minWidth: 'auto', px: 1, mt: '1px' }}
            >
              <AutoFixHigh fontSize="small" />
            </Button>
          </Tooltip>
        )}
      </Box>
      {template && (
        <Typography variant="body2" color="text.secondary">
          {t('localMatchingRule.patternResult', 'Pattern')}: {pattern}
        </Typography>
      )}
      {filesInFolder.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('localMatchingRule.filesInFolder', 'Files in folder')} (
            {template
              ? t(
                  'localMatchingRule.matchCount',
                  '{{matched}} / {{total}} matched',
                  { matched: matchCount, total: filesInFolder.length }
                )
              : filesInFolder.length}
            )
          </Typography>
          <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
            {fileMatches.map((file) => {
              const isMatch = template && file.episodeNumber !== null
              return (
                <ListItem key={file.fullPath} disablePadding sx={{ pl: 1 }}>
                  {template && (
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {isMatch ? (
                        <Check fontSize="small" color="success" />
                      ) : (
                        <Close fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={file.fileName}
                    secondary={
                      isMatch
                        ? t(
                            'localMatchingRule.episodeMatch',
                            'Episode {{number}}',
                            { number: file.episodeNumber }
                          )
                        : undefined
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      color: 'success.main',
                    }}
                  />
                </ListItem>
              )
            })}
          </List>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={handleSave} size="small">
          {t('common.save', 'Save')}
        </Button>
        {isEditing && onDelete && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => onDelete(rule.mapKey)}
            size="small"
          >
            {t('common.delete', 'Delete')}
          </Button>
        )}
      </Box>
    </FormGrid>
  )
}
