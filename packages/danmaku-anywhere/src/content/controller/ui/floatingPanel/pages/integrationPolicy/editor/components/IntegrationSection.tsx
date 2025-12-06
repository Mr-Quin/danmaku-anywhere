import { Add, Colorize, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  styled,
  Typography,
} from '@mui/material'
import type { FieldErrors } from 'react-hook-form'
import { get, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'

import type { IntegrationRuleItemNames } from '../types'
import { RegexRuleItem } from './RegexRuleItem'
import { SelectorRuleItem } from './SelectorRuleItem'

interface NoRulesConfiguredProps {
  type: 'selector' | 'regex'
}

const NoRulesConfigured = ({ type }: NoRulesConfiguredProps) => {
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

const StyledAccordion = styled(Accordion)(({ theme }) => {
  return {
    '&:before': { display: 'none' },
    backgroundColor: 'transparent',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  }
})

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  '& .MuiAccordionSummary-content': {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}))

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}))

interface IntegrationSectionProps {
  name: IntegrationRuleItemNames
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  onOpenSelector: (callback: (xpath: string) => void) => void
}

export const IntegrationSection = ({
  label,
  name,
  onOpenSelector,
}: IntegrationSectionProps) => {
  const { t } = useTranslation()
  const {
    control,
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

  const getErrorMessage = (
    index: number,
    type: 'selector' | 'regex'
  ): (() => string | undefined) => {
    return () => {
      return get(errors, `${name}.${type}.${index}.value.message`)
    }
  }

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
                color="secondary"
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
                color="secondary"
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
                  getErrorMessage={getErrorMessage(index, 'selector')}
                  onOpenSelector={onOpenSelector}
                  remove={removeSelector}
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
                color="secondary"
                onClick={handleAddRegex}
                size="small"
                sx={{ mr: 1 }}
              >
                {t('integrationPolicyPage.editor.addRegex', 'Add')}
              </Button>
            </div>
          </Stack>
          {regexFields.length > 0 && (
            <Stack spacing={1}>
              {regexFields.map((value, index) => (
                <RegexRuleItem
                  key={value.id}
                  index={index}
                  name={name}
                  control={control}
                  remove={removeRegex}
                  getErrorMessage={getErrorMessage(index, 'regex')}
                />
              ))}
            </Stack>
          )}
        </>
      </StyledAccordionDetails>
    </StyledAccordion>
  )
}
