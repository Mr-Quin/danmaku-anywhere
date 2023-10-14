import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material'
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { createUrlPattern } from '@/common/utils'
import { blankMountConfig } from '@/common/constants'
import {
  useActiveTabUrl,
  useCurrentMountConfig,
  useMountConfig,
} from '@/common/hooks/mountConfig/useMountConfig'

const validatePattern = (pattern: string) => {
  try {
    createUrlPattern(pattern)
    return true
  } catch (e) {
    return false
  }
}

// interface MountConfigProps {
//   config: MountConfigWithoutId
//   onUpdate?: (id: number, updatedConfig: MountConfigWithoutId) => void
//   onAdd?: (newConfig: MountConfigWithoutId) => void
//   onDelete?: (id: number) => void
// }

export const MountConfigEditor = () => {
  const url = useActiveTabUrl()
  const { updateConfig, addConfig, deleteConfig, configs } = useMountConfig()

  const config =
    useCurrentMountConfig(url, configs) ?? blankMountConfig(url ?? '')

  const [localConfig, setLocalConfig] = useState(config)
  const [patternErrors, setPatternErrors] = useState<string[]>([])

  const isAdd = config.id === undefined

  const handlePatternChange = (index: number, value: string) => {
    const newPatterns = [...localConfig.patterns]
    newPatterns[index] = value
    setLocalConfig((prev) => ({ ...prev, patterns: newPatterns }))
  }

  const addPatternField = () => {
    setLocalConfig((prev) => ({ ...prev, patterns: [...prev.patterns, ''] }))
  }

  const removePatternField = (index: number) => {
    const newPatterns = [...localConfig.patterns]
    newPatterns.splice(index, 1)
    setLocalConfig((prev) => ({ ...prev, patterns: newPatterns }))
  }

  const reset = () => {
    setLocalConfig(config)
  }

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSave = () => {
    if (localConfig.patterns.length === 0) return

    const patternsValid = localConfig.patterns.map(validatePattern)

    setPatternErrors(
      patternsValid.map((valid) => (valid ? '' : 'Invalid pattern'))
    )

    if (!patternsValid.every((valid) => valid)) return

    if (isAdd) {
      addConfig?.(localConfig)
    } else if (updateConfig) {
      updateConfig?.(config.id!, localConfig)
    }
  }

  return (
    <Stack direction="column" spacing={2}>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Typography variant="h6">
          {isAdd ? 'Add Config' : `Editing config ${config.id}`}
        </Typography>
        {!isAdd && !config.predefined && (
          <IconButton onClick={() => deleteConfig?.(config.id!)}>
            <RemoveCircleOutline />
          </IconButton>
        )}
      </Stack>

      {localConfig.patterns.length === 0 && (
        <Typography variant="body2" color="error">
          No patterns provided
        </Typography>
      )}
      {localConfig.patterns.map((pattern, index) => (
        <Stack direction="row" spacing={2} alignItems="center" key={index}>
          <TextField
            label={`Pattern ${index + 1}`}
            value={pattern}
            error={!!patternErrors[index]}
            helperText={patternErrors[index]}
            size="small"
            onChange={(e) => handlePatternChange(index, e.target.value)}
            fullWidth
          />
          <Box>
            <IconButton onClick={() => removePatternField(index)}>
              <RemoveCircleOutline />
            </IconButton>
          </Box>
        </Stack>
      ))}

      <Button onClick={addPatternField} startIcon={<AddCircleOutline />}>
        Add Pattern
      </Button>

      <TextField
        label="Name"
        value={localConfig.name}
        size="small"
        onChange={(e) =>
          setLocalConfig((prev) => ({ ...prev, name: e.target.value }))
        }
        fullWidth
      />

      <TextField
        label="Media Query"
        value={localConfig.mediaQuery}
        size="small"
        onChange={(e) =>
          setLocalConfig((prev) => ({ ...prev, mediaQuery: e.target.value }))
        }
        fullWidth
      />

      <TextField
        label="Container Query"
        value={localConfig.containerQuery}
        size="small"
        onChange={(e) =>
          setLocalConfig((prev) => ({
            ...prev,
            containerQuery: e.target.value,
          }))
        }
        fullWidth
      />
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button variant="outlined" color="error" onClick={reset}>
          Reset
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          {isAdd ? 'Add' : 'Update'} Config
        </Button>
      </Stack>
    </Stack>
  )
}
