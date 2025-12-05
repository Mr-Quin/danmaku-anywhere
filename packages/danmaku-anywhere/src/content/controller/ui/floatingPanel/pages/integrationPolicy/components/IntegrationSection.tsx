import { Add, Colorize, Delete, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import type { Control, FieldErrors } from 'react-hook-form'
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import type { IntegrationRuleItemNames } from '../types'

const NoRulesConfigured = ({ type }: { type: 'selector' | 'regex' }) => {
  const { t } = useTranslation()

  return (
    <Box display="flex" alignItems="center" justifyContent="center" py={2}>
      {type === 'selector' ? (
        <>
          <Typography variant="body2" color="text.secondary">
            {t(
              'integrationPolicyPage.editor.noXpathSelectors',
              'No XPath selectors. Click "Pick" to select an element'
            )}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {t(
              'integrationPolicyPage.editor.noRegexConfigured',
              'No regex patterns. Click "Add" to add a regex'
            )}
          </Typography>
        </>
      )}
    </Box>
  )
}

const RuleItemBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 1,
  padding: theme.spacing(1),
}))

interface RegexRuleItemProps {
  index: number
  name: IntegrationRuleItemNames
  control: Control<IntegrationInput>
  remove: (index: number) => void
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
}

const RegexRuleItem = ({
  index,
  name,
  control,
  remove,
  getErrorMessage,
}: RegexRuleItemProps) => {
  const { t } = useTranslation()

  return (
    <RuleItemBox>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" color="text.secondary">
          #{index + 1}
        </Typography>
        <div>
          <IconButton onClick={() => remove(index)} size="small">
            <Delete fontSize="small" />
          </IconButton>
        </div>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Controller
          name={`${name}.regex.${index}.value` as const}
          control={control}
          render={({ field }) => (
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder=".*"
              {...field}
            />
          )}
        />
        <FormControlLabel
          control={
            <Controller
              name={`${name}.regex.${index}.quick` as const}
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
          label={t('integrationPolicyPage.editor.quick', 'Quick')}
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
    </RuleItemBox>
  )
}

interface MatchXPathResult {
  isMatch: boolean
  text: string | null
}

function matchXPath(xpath: string): MatchXPathResult {
  const node = getElementByXpath(xpath)
  return {
    isMatch: !!node,
    text: node?.textContent ?? null,
  }
}

const DenseAlert = styled(Alert)(({ theme }) => ({
  padding: theme.spacing(0, 1),
}))

interface SelectorRuleItemProps {
  index: number
  name: IntegrationRuleItemNames
  control: Control<IntegrationInput>
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  errors: FieldErrors<IntegrationInput>
  label: string
  onOpenSelector: (callback: (xpath: string) => void) => void
  remove: (index: number) => void
  renderPrefix: (index: number) => ReactNode
}

const SelectorRuleItem = ({
  index,
  name,
  control,
  getErrorMessage,
  errors,
  label,
  onOpenSelector,
  remove,
  renderPrefix,
}: SelectorRuleItemProps) => {
  const { t } = useTranslation()
  const { setValue } = useFormContext<IntegrationInput>()

  const value = useWatch({ control, name: `${name}.selector.${index}.value` })

  const [matchText, setMatchText] = useState<MatchXPathResult | null>(() => {
    return matchXPath(value)
  })

  useEffect(() => {
    setMatchText(matchXPath(value))
  }, [value])

  return (
    <RuleItemBox>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" color="text.secondary">
          #{index + 1}
        </Typography>
        <div>
          <IconButton
            onClick={() =>
              onOpenSelector((xpath) => {
                setValue(`${name}.selector.${index}.value` as const, xpath, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              })
            }
            size="small"
          >
            <Colorize fontSize="small" />
          </IconButton>
          <IconButton onClick={() => remove(index)} size="small">
            <Delete fontSize="small" />
          </IconButton>
        </div>
      </Stack>
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
            />
          )}
        />
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
          label={t('integrationPolicyPage.editor.quick', 'Quick')}
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
      {matchText?.isMatch ? (
        matchText.text ? (
          <DenseAlert icon={false} severity="success">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" color="success.main">
                Matched:
              </Typography>
              <Typography variant="subtitle2" noWrap title={matchText.text}>
                {matchText.text}
              </Typography>
            </Stack>
          </DenseAlert>
        ) : (
          <DenseAlert severity="warning">
            A node is found, but the text is empty
          </DenseAlert>
        )
      ) : (
        <DenseAlert severity="error">
          The XPath is invalid or no node is matched
        </DenseAlert>
      )}
    </RuleItemBox>
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
  borderTop: `1px solid ${theme.palette.divider}`,
}))

interface IntegrationSectionProps {
  name: IntegrationRuleItemNames
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  renderPrefix: (index: number) => ReactNode
  onOpenSelector: (callback: (xpath: string) => void) => void
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

  const {
    fields: regexFields,
    append: appendRegex,
    remove: removeRegex,
  } = useFieldArray({
    control,
    name: `${name}.regex`,
  })
  // Watch the fields to trigger re-render when the fields change
  watch(name)

  const handleAddManual = () => {
    appendSelector({ value: '', quick: false }, { shouldFocus: true })
  }

  const handleAddRegex = () => {
    appendRegex({ value: '', quick: false }, { shouldFocus: true })
  }

  const handlePickElement = () => {
    onOpenSelector((xpath) => {
      appendSelector({ value: xpath, quick: false })
    })
  }

  return (
    <StyledAccordion disableGutters elevation={0}>
      <StyledAccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle1">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t(
            'integrationPolicyPage.editor.selectorRuleCount',
            '{{count}} XPath',
            {
              count: selectorFields.length,
            }
          )}
          {regexFields.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              ,{' '}
              {t(
                'integrationPolicyPage.editor.regexRuleCount',
                '{{count}} regex',
                {
                  count: regexFields.length,
                }
              )}
            </Typography>
          )}
        </Typography>
      </StyledAccordionSummary>
      <StyledAccordionDetails>
        <>
          {/* Selector Section */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2">
              {t(
                'integrationPolicyPage.editor.xpathSelectors',
                'XPath Selectors'
              )}
            </Typography>
            <div>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Colorize />}
                onClick={handlePickElement}
                size="small"
                sx={{ mr: 1 }}
              >
                {t('integrationPolicyPage.editor.pickElement', 'Pick')}
              </Button>
              <Button
                variant="text"
                startIcon={<Add />}
                onClick={handleAddManual}
                size="small"
              >
                {t('integrationPolicyPage.editor.addManual', 'Add')}
              </Button>
            </div>
          </Stack>
          {selectorFields.length === 0 ? (
            <NoRulesConfigured type="selector" />
          ) : (
            <Stack spacing={1}>
              {selectorFields.map((value, index) => (
                <SelectorRuleItem
                  key={value.id}
                  index={index}
                  name={name}
                  control={control}
                  getErrorMessage={getErrorMessage}
                  errors={errors}
                  label={label}
                  onOpenSelector={onOpenSelector}
                  remove={removeSelector}
                  renderPrefix={renderPrefix}
                />
              ))}
            </Stack>
          )}
          <Divider sx={{ my: 2, mx: -2 }} />
          {/* Regex Section */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2">
              {t('integrationPolicyPage.editor.regex', 'Regex (Optional)')}
            </Typography>
            <div>
              <Button
                variant="text"
                startIcon={<Add />}
                onClick={handleAddRegex}
                size="small"
              >
                {t('integrationPolicyPage.editor.addRegex', 'Add')}
              </Button>
            </div>
          </Stack>
          {regexFields.length === 0 ? (
            <NoRulesConfigured type="regex" />
          ) : (
            <Stack spacing={1}>
              {regexFields.map((value, index) => (
                <RegexRuleItem
                  key={value.id}
                  index={index}
                  name={name}
                  control={control}
                  getErrorMessage={getErrorMessage}
                  remove={removeRegex}
                />
              ))}
            </Stack>
          )}
        </>
      </StyledAccordionDetails>
    </StyledAccordion>
  )
}
