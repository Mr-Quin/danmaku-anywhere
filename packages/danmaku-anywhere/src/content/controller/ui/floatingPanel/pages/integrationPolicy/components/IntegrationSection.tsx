import { Add, Colorize, ExpandMore, Remove } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import type { FieldErrors } from 'react-hook-form'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

export type ArrayFieldNames =
  | 'policy.title.selector'
  | 'policy.title.regex'
  | 'policy.episode.selector'
  | 'policy.episode.regex'
  | 'policy.season.selector'
  | 'policy.season.regex'
  | 'policy.episodeTitle.selector'
  | 'policy.episodeTitle.regex'

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: 'none',
  border: `1px solid ${theme.palette.divider}`,
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}))

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  minHeight: 48,
  '&.Mui-expanded': {
    minHeight: 48,
  },
  '& .MuiAccordionSummary-content': {
    margin: '12px 0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}))

interface IntegrationSectionProps {
  name: ArrayFieldNames
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  renderPrefix: (index: number) => ReactNode
  onOpenSelector: (index: number) => void
}

export const IntegrationSection = ({
  name,
  label,
  getErrorMessage,
  renderPrefix,
  onOpenSelector,
}: IntegrationSectionProps) => {
  const { t } = useTranslation()
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<IntegrationInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  })

  // Watch the fields to trigger re-render when the fields change
  watch(name)

  const handleAddManual = () => {
    append({ value: '', quick: false }, { shouldFocus: true })
  }

  const handlePickElement = () => {
    append({ value: '', quick: false })
    // The index of the new element is fields.length (before update) or fields.length after?
    // React state update is async.
    // We need to open selector for the NEW index.
    // But we can't easily know it here synchronously if we just appended.
    // Actually, the parent `IntegrationEditor` handles `onOpenSelector` by setting state.
    // We can pass the index.
    // Better: just call onOpenSelector with the new index.
    // But fields is not updated yet.
    // We can assume it will be fields.length.
    onOpenSelector(fields.length)
  }

  return (
    <StyledAccordion defaultExpanded>
      <StyledAccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {fields.length} rules
        </Typography>
      </StyledAccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        {fields.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
            py={2}
          >
            <Typography variant="body2" color="error">
              No rules configured
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click the dropper to select an element
            </Typography>
            <Stack direction="row" spacing={2} width="100%">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Colorize />}
                fullWidth
                onClick={handlePickElement}
              >
                Pick Element
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddManual}
              >
                Manual
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2}>
            {fields.map((value, index) => (
              <Box display="flex" alignItems="center" key={value.id}>
                {renderPrefix(index)}
                <Controller
                  name={`${name}.${index}.value` as const}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      variant="standard"
                      fullWidth
                      {...withStopPropagation()}
                      {...field}
                      error={!!getErrorMessage(errors, index)}
                      helperText={getErrorMessage(errors, index)}
                      label={`${label} ${index + 1}`}
                    />
                  )}
                />
                <IconButton onClick={() => onOpenSelector(index)}>
                  <Colorize />
                </IconButton>
                <FormControlLabel
                  control={
                    <Controller
                      name={`${name}.${index}.quick` as const}
                      control={control}
                      defaultValue={false}
                      render={({ field: { value, ref, ...field } }) => (
                        <Checkbox
                          {...field}
                          inputRef={ref}
                          checked={value}
                          color="primary"
                        />
                      )}
                    />
                  }
                  label={t('integrationPolicyPage.editor.quick')}
                  labelPlacement="top"
                  slotProps={{
                    typography: {
                      variant: 'caption',
                    },
                  }}
                  sx={{ m: 0 }}
                />
                <IconButton onClick={() => remove(index)}>
                  <Remove />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<Add />} onClick={handleAddManual}>
              Add Rule
            </Button>
          </Stack>
        )}
      </AccordionDetails>
    </StyledAccordion>
  )
}
