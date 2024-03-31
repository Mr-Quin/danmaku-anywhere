import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { produce } from 'immer'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useOutletContext } from 'react-router-dom'

import type { ConfigEditorContext } from '../ConfigPage'

import { ConfigEditorToolbar } from './ConfigEditorToolbar'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { validateOrigin } from '@/common/utils'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useImperitaveRender } from '@/popup/hooks/useImperitaveRender'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const MountConfigEditor = () => {
  const { updateConfig, addConfig, deleteConfig, nameExists } = useMountConfig()

  const [dialogOpen, setDialogOpen] = useState(false)

  const goBack = useGoBack()

  const { isEdit, config } = useOutletContext<ConfigEditorContext>()

  const {
    handleSubmit,
    control,
    register,
    unregister,
    setValue,
    getValues,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<MountConfig>({
    values: config,
  })

  const reRender = useImperitaveRender()

  const addPatternField = () => {
    setValue('patterns', [...getValues().patterns, ''])
    // rhf does not trigger re-render when array is updated, so we need to manually trigger it
    // otherwise the new field will not be rendered
    reRender()
  }

  const removePatternField = (index: number) => {
    setValue(
      'patterns',
      produce(getValues().patterns, (draft) => {
        draft.splice(index, 1)
      })
    )
    unregister(`patterns.${index}`)
    reRender()
  }

  const reset = () => {
    resetForm()
  }

  const handleDelete = async () => {
    handleOpenDialog()
  }

  const handleConfirmDelete = async () => {
    await deleteConfig(config.name)
    goBack()
  }

  const handleSave = async (data: MountConfig) => {
    if (data.patterns.length === 0) return

    if (isEdit) {
      await updateConfig(config.name, data)
    } else {
      await addConfig(data)
    }

    goBack()
  }

  const validateName = (name: string) => {
    if (isEdit) return
    if (nameExists(name)) {
      return 'Name already exists'
    }
  }

  const handleOpenDialog = () => {
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  return (
    <OptionsPageLayout direction="up">
      <ConfigEditorToolbar onDelete={handleDelete} />
      <Box px={2} mt={2} component="form" onSubmit={handleSubmit(handleSave)}>
        <Stack direction="column" spacing={2} alignItems="flex-start">
          <Typography variant="body2" color="textSecondary">
            URL Patterns
          </Typography>

          {getValues().patterns.map((_, index, arr) => (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              key={index}
              sx={{ alignSelf: 'stretch' }}
            >
              <TextField
                label={`Pattern ${index + 1}`}
                error={!!errors.patterns?.[index]}
                helperText={errors.patterns?.[index]?.message}
                size="small"
                {...register(`patterns.${index}`, { validate: validateOrigin })}
                fullWidth
                required
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
            size="small"
            error={!!errors.name}
            helperText={
              isEdit
                ? 'To change the name, delete this config and add a new one'
                : errors.name?.message ??
                  'Name cannot be changed after creation'
            }
            {...register('name', { required: true, validate: validateName })}
            disabled={isEdit}
            fullWidth
            required
          />

          <TextField
            label="Media Query"
            size="small"
            error={!!errors.mediaQuery}
            helperText={errors.mediaQuery?.message}
            {...register('mediaQuery', { required: true })}
            fullWidth
            required
          />

          <FormControl>
            <FormControlLabel
              control={
                <Controller
                  name="enabled"
                  control={control}
                  render={({ field: { value, ref, ...field } }) => (
                    <Checkbox
                      {...field}
                      inputRef={ref}
                      checked={!!value}
                      color="primary"
                    />
                  )}
                />
              }
              label="Enabled"
            />
          </FormControl>

          <LoadingButton
            variant="contained"
            color="primary"
            type="submit"
            loading={isSubmitting}
          >
            {!isEdit ? 'Add' : 'Save'} Config
          </LoadingButton>
          {isEdit && (
            <Button variant="outlined" onClick={reset} disabled={isSubmitting}>
              Reset
            </Button>
          )}
        </Stack>
      </Box>
      <ConfirmDeleteDialog
        name={config.name}
        open={dialogOpen}
        onClose={handleCloseDialog}
        onDelete={handleConfirmDelete}
      />
    </OptionsPageLayout>
  )
}
