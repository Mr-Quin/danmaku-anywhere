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
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { produce } from 'immer'
import { useState } from 'react'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { validateOrigin } from '@/common/utils'

export const MountConfigEditor = ({
  editConfig,
  goBack,
  edit,
}: {
  editConfig: MountConfig
  goBack: () => void
  edit: boolean
}) => {
  const { updateConfig, addConfig, deleteConfig } = useMountConfig()

  const [localConfig, setLocalConfig] = useState(editConfig)
  const [patternErrors, setPatternErrors] = useState<string[]>([])

  const handlePatternChange = (index: number, value: string) => {
    setLocalConfig((prev) =>
      produce(prev, (draft) => {
        draft.patterns[index] = value
      })
    )
  }

  const addPatternField = () => {
    setLocalConfig((prev) =>
      produce(prev, (draft) => {
        draft.patterns.push('')
      })
    )
  }

  const removePatternField = (index: number) => {
    setLocalConfig((prev) =>
      produce(prev, (draft) => {
        draft.patterns.splice(index, 1)
      })
    )
  }

  const reset = () => {
    setLocalConfig(editConfig)
  }

  const handleSave = async () => {
    if (localConfig.patterns.length === 0) return

    const patternsValid = await Promise.all(
      localConfig.patterns.map((pattern) => validateOrigin(pattern))
    )

    setPatternErrors(patternsValid)

    if (!patternsValid.every((err) => err === '')) return

    if (edit) {
      await updateConfig(editConfig.name, localConfig)
    } else {
      await addConfig(localConfig)
    }

    goBack()
  }

  const handleDelete = async (name: string) => {
    await deleteConfig(name)
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
            {edit ? `Edit ${editConfig.name}` : 'Add Mount Config'}
          </Typography>
          {edit && (
            <IconButton
              edge="end"
              onClick={() => handleDelete(editConfig.name)}
            >
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

          <FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localConfig.enabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
              }
              label="Enabled"
            />
          </FormControl>

          <Button variant="contained" color="primary" type="submit">
            {!edit ? 'Add' : 'Save'} Config
          </Button>
          {edit && (
            <Button variant="outlined" onClick={reset}>
              Reset
            </Button>
          )}
        </Stack>
      </Box>
    </>
  )
}
