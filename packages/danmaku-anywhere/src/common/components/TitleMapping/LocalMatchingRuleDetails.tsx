import type { CustomEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { Check, Close } from '@mui/icons-material'
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
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import type { LocalMatchingRule } from '@/common/options/localMatchingRule/schema'
import {
  localMatchingRuleSchema,
  renderLocalMatchingPattern,
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

  // Build a set of rendered pattern results for episodes 1..N to check matches
  const matchedFiles = useMemo(() => {
    if (!template) {
      return new Set<string>()
    }
    const matched = new Set<string>()
    // Check a generous range of episode numbers
    const maxEp = Math.max(filesInFolder.length + 10, 200)
    for (let ep = 1; ep <= maxEp; ep++) {
      const rendered = composePattern(
        folder,
        renderLocalMatchingPattern(template, ep)
      )
      matched.add(rendered)
    }
    return matched
  }, [template, folder, filesInFolder.length])

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

  const matchCount = filesInFolder.filter((f) =>
    matchedFiles.has(f.fullPath)
  ).length

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
            {filesInFolder.map((file) => {
              const isMatch = template && matchedFiles.has(file.fullPath)
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
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
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
