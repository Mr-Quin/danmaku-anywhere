// Array Item Component for XPath Selectors
import { Colorize } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { Box, Button, IconButton, TextField } from '@mui/material'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { FieldErrors, UseControllerProps } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { getRandomUUID } from '@/common/utils/utils'

interface InputFieldArrayProps {
  name: UseControllerProps<IntegrationInput>['name']
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  getInitialValue: (values: IntegrationInput) => string[]
  renderPrefix: (index: number) => ReactNode
  onOpenSelector?: (index: number) => void
}

export const InputFieldArray = ({
  name,
  label,
  getErrorMessage,
  getInitialValue,
  renderPrefix,
  onOpenSelector,
}: InputFieldArrayProps) => {
  const { t } = useTranslation()

  const {
    control,
    getValues,
    setValue,
    formState: { errors },
    trigger,
  } = useFormContext<IntegrationInput>()

  const fieldValues = useWatch({ control })

  const [localValues, setLocalValues] = useState<
    { value: string; id: string }[]
  >(() =>
    getInitialValue(getValues()).map((value) => ({
      value,
      id: getRandomUUID(), // id is used to identify the item in the list, not part of the final value
    }))
  )

  useEffect(() => {
    // Workaround for react-hook-form not working with primitive array
    // When the form value changes from elsewhere, update the local state
    // Very hacky
    setLocalValues(
      getInitialValue(getValues()).map((value) => ({
        value,
        id: localValues.find((v) => v.value === value)?.id ?? getRandomUUID(),
      }))
    )
  }, [fieldValues])

  const flushChanges = (newValues: { value: string; id: string }[]) => {
    setLocalValues(newValues)
    setValue(
      name,
      newValues.map((v) => v.value)
    )
  }

  const append = () => {
    flushChanges([
      ...localValues,
      {
        value: '',
        id: getRandomUUID(),
      },
    ])
  }

  const remove = (index: number) => {
    flushChanges(localValues.toSpliced(index, 1))
  }

  const handleChange = (index: number, value: string) => {
    const newValues = localValues.toSpliced(index, 1, {
      value,
      id: localValues[index].id,
    })
    flushChanges(newValues)
    void trigger(name)
  }

  return (
    <Box mb={2}>
      <Controller
        name={name}
        control={control}
        render={() => {
          return (
            <>
              {localValues.map((value, index) => {
                return (
                  <Box display="flex" alignItems="center" mb={1} key={value.id}>
                    {renderPrefix(index)}
                    <TextField
                      variant="standard"
                      fullWidth
                      value={value.value}
                      onChange={(e) => handleChange(index, e.target.value)}
                      error={!!getErrorMessage(errors, index)}
                      helperText={getErrorMessage(errors, index)}
                      label={`${label}[${index}]`}
                    />
                    {onOpenSelector && (
                      <IconButton onClick={() => onOpenSelector(index)}>
                        {/*Eyedropper icon*/}
                        <Colorize />
                      </IconButton>
                    )}
                    {
                      // Only allow removing if there are more than 1 item
                      localValues.length > 1 && (
                        <IconButton onClick={() => remove(index)}>
                          <RemoveIcon />
                        </IconButton>
                      )
                    }
                  </Box>
                )
              })}
            </>
          )
        }}
      />
      <Button variant="text" startIcon={<AddIcon />} onClick={() => append()}>
        {t('common.add')}
      </Button>
    </Box>
  )
}
