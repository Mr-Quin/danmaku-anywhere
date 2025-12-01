import { Add, Colorize, Delete, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  styled,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import type { IntegrationRuleItemNames } from '../types'

const NoRulesConfigured = () => {
  const { t } = useTranslation()

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1}
      py={2}
    >
      <Typography variant="body2">
        {t(
          'integrationPolicyPage.editor.noRulesConfigured',
          'No rules configured'
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t(
          'integrationPolicyPage.editor.clickDropper',
          'Click the dropper to select an element'
        )}
      </Typography>
    </Box>
  )
}

interface RuleItemProps {
  index: number
  name: IntegrationRuleItemNames
  control: Control<IntegrationInput>
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  errors: FieldErrors<IntegrationInput>
  label: string
  onOpenSelector: (index: number) => void
  remove: (index: number) => void
  renderPrefix: (index: number) => ReactNode
}

const RuleItem = ({
  index,
  name,
  control,
  getErrorMessage,
  errors,
  label,
  onOpenSelector,
  remove,
  renderPrefix,
}: RuleItemProps) => {
  const { t } = useTranslation()

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {renderPrefix(index)}
        <Typography variant="caption" color="text.secondary">
          {t('integrationPolicyPage.editor.rule', 'Rule')}
          {index + 1}
        </Typography>
        <IconButton
          onClick={() => remove(index)}
          sx={{
            ml: 'auto',
          }}
          size="small"
        >
          <Delete fontSize="small" />
        </IconButton>
      </Stack>
      {/* XPath input */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Controller
          name={`${name}.selector.${index}.value` as const}
          control={control}
          render={({ field }) => (
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder='//div[@class="example"]'
              {...withStopPropagation()}
              {...field}
              error={!!getErrorMessage(errors, index)}
              helperText={getErrorMessage(errors, index)}
              label={`${label} ${index + 1}`}
            />
          )}
        />
        <Tooltip
          title={t(
            'integrationPolicyPage.editor.tooltip.repickElement',
            'Pick the element again'
          )}
        >
          <IconButton onClick={() => onOpenSelector(index)} size="small">
            <Colorize fontSize="small" />
          </IconButton>
        </Tooltip>
        <FormControlLabel
          control={
            <Controller
              name={`${name}.selector.${index}.quick` as const}
              control={control}
              defaultValue={false}
              render={({ field: { value, ref, ...field } }) => (
                <Checkbox
                  {...field}
                  inputRef={ref}
                  checked={value}
                  color="primary"
                  size="small"
                />
              )}
            />
          }
          label={t('integrationPolicyPage.editor.quick')}
          labelPlacement="top"
          slotProps={{
            typography: {
              variant: 'caption',
              color: 'text.secondary',
              sx: {
                mb: -1,
              },
            },
          }}
          sx={{ m: 0 }}
        />
      </Stack>
      {/* Regex input */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Controller
          name={`${name}.regex.${index}.value` as const}
          control={control}
          render={({ field }) => (
            <TextField variant="outlined" size="small" fullWidth {...field} />
          )}
        />
      </Stack>
    </Stack>
  )
}

const StyledAccordion = styled(Accordion)(({ theme }) => {
  return {
    '&:before': { display: 'none' },
    backgroundColor: 'transparent',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 1,
  }
})

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  '& .MuiAccordionSummary-content': {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}))

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}))

interface IntegrationSectionProps {
  name: IntegrationRuleItemNames
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

  const {
    fields: selectorFields,
    append: appendSelector,
    remove: removeSelector,
  } = useFieldArray({
    control,
    name: `${name}.selector`,
  })

  const { append: appendRegex, remove: removeRegex } = useFieldArray({
    control,
    name: `${name}.regex`,
  })
  // Watch the fields to trigger re-render when the fields change
  watch(name)

  const handleAddManual = () => {
    appendSelector({ value: '', quick: false }, { shouldFocus: true })
    appendRegex({ value: '', quick: false }, { shouldFocus: true })
  }

  const handlePickElement = () => {
    appendSelector({ value: '', quick: false })
    appendRegex({ value: '', quick: false })
    // The index of the new element is fields.length (before update) or fields.length after?
    // React state update is async.
    // We need to open selector for the NEW index.
    // But we can't easily know it here synchronously if we just appended.
    // Actually, the parent `IntegrationEditor` handles `onOpenSelector` by setting state.
    // We can pass the index.
    // Better: just call onOpenSelector with the new index.
    // But fields is not updated yet.
    // We can assume it will be fields.length.
    onOpenSelector(selectorFields.length)
  }

  function removeItem(index: number) {
    removeSelector(index)
    removeRegex(index)
  }

  return (
    <StyledAccordion disableGutters elevation={0}>
      <StyledAccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t('integrationPolicyPage.editor.rulesCount', '{{count}} rules', {
            count: selectorFields.length,
          })}
        </Typography>
      </StyledAccordionSummary>
      <StyledAccordionDetails>
        <>
          {selectorFields.length === 0 ? (
            <NoRulesConfigured />
          ) : (
            <Stack spacing={2}>
              {selectorFields.map((value, index) => (
                <>
                  <RuleItem
                    key={value.id}
                    index={index}
                    name={name}
                    control={control}
                    getErrorMessage={getErrorMessage}
                    errors={errors}
                    label={label}
                    onOpenSelector={onOpenSelector}
                    remove={removeItem}
                    renderPrefix={renderPrefix}
                  />
                  {index < selectorFields.length - 1 && <Divider />}
                </>
              ))}
            </Stack>
          )}
          <Stack direction="row" spacing={2} width="100%">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Colorize />}
              fullWidth
              onClick={handlePickElement}
              size="small"
            >
              {t('integrationPolicyPage.editor.pickElement', 'Pick Element')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddManual}
              size="small"
            >
              {t('integrationPolicyPage.editor.addManual', 'Manual')}
            </Button>
          </Stack>
        </>
      </StyledAccordionDetails>
    </StyledAccordion>
  )
}
