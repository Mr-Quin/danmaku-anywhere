import {
  AddCircleOutline,
  ArrowBack,
  Delete,
  RemoveCircleOutline,
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { useStore } from '../store'

import type {
  MountConfig,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { Logger } from '@/common/services/Logger'
import { createUrlPattern, getOrigin } from '@/common/utils'

const validatePattern = (pattern: string) => {
  try {
    createUrlPattern(pattern)
    return true
  } catch (e) {
    Logger.debug('Invalid pattern', e)
    return false
  }
}

export const MountConfigEditor = ({
  editConfig,
  goBack,
}: {
  editConfig: MountConfigWithoutId | MountConfig
  goBack: () => void
}) => {
  const url = useStore((state) => state.tabUrl)

  const { updateConfig, addConfig, deleteConfig } = useMountConfig()

  const [localConfig, setLocalConfig] = useState(editConfig)
  const [patternErrors, setPatternErrors] = useState<string[]>([])

  const isAdd = editConfig.id === undefined

  const handlePatternChange = (index: number, value: string) => {
    const newPatterns = [...localConfig.patterns]
    newPatterns[index] = value
    setLocalConfig((prev) => ({ ...prev, patterns: newPatterns }))
  }

  const addPatternField = () => {
    setLocalConfig((prev) => ({
      ...prev,
      patterns: [...prev.patterns, getOrigin(url)],
    }))
  }

  const removePatternField = (index: number) => {
    const newPatterns = [...localConfig.patterns]
    newPatterns.splice(index, 1)
    setLocalConfig((prev) => ({ ...prev, patterns: newPatterns }))
  }

  const reset = () => {
    setLocalConfig(editConfig)
  }

  const handleSave = async () => {
    if (localConfig.patterns.length === 0) return

    const patternsValid = localConfig.patterns.map(validatePattern)

    setPatternErrors(
      patternsValid.map((valid) => (valid ? '' : 'Invalid pattern'))
    )

    if (!patternsValid.every((valid) => valid)) return

    if (isAdd) {
      await addConfig(localConfig)
    } else if (updateConfig) {
      await updateConfig(editConfig.id!, localConfig)
    }

    goBack()
  }

  const handleDelete = async (id: number) => {
    await deleteConfig(id)
    goBack()
  }

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
          <IconButton edge="start" onClick={goBack}>
            <ArrowBack />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translate(-50%)',
            }}
          >
            {editConfig?.id !== undefined
              ? `Edit ${editConfig.name}`
              : 'Add Mount Config'}
          </Typography>
          {!editConfig.predefined && !isAdd && (
            <IconButton edge="end" onClick={() => handleDelete(editConfig.id!)}>
              <Delete />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Box
        px={2}
        mt={2}
        component="form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
      >
        <Stack direction="column" spacing={2} alignItems="flex-start">
          <Typography variant="body2" color="textSecondary">
            URL Patterns
          </Typography>

          {localConfig.patterns.map((pattern, index, arr) => (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              key={index}
              sx={{ alignSelf: 'stretch' }}
            >
              <TextField
                label={`Pattern ${index + 1}`}
                value={pattern}
                error={!!patternErrors[index]}
                helperText={patternErrors[index]}
                size="small"
                onChange={(e) => handlePatternChange(index, e.target.value)}
                fullWidth
              />
              {arr.length > 1 ? (
                <Box>
                  <IconButton onClick={() => removePatternField(index)}>
                    <RemoveCircleOutline />
                  </IconButton>
                </Box>
              ) : (
                <Box />
              )}
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
            required
            fullWidth
          />

          <TextField
            label="Media Query"
            value={localConfig.mediaQuery}
            size="small"
            onChange={(e) =>
              setLocalConfig((prev) => ({
                ...prev,
                mediaQuery: e.target.value,
              }))
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
          <Button variant="contained" color="primary" type="submit">
            {isAdd ? 'Add' : 'Save'} Config
          </Button>
          {!isAdd && (
            <Button variant="outlined" onClick={reset}>
              Reset
            </Button>
          )}
        </Stack>
      </Box>
    </>
  )
}
