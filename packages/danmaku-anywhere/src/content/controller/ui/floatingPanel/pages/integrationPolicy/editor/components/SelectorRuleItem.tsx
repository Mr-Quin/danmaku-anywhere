import { Colorize } from '@mui/icons-material'
import {
  Alert,
  IconButton,
  Stack,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { Control } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import type { IntegrationRuleItemNames } from '../types'
import { QuickCheckbox } from './QuickCheckbox'
import { RuleItemBox } from './RuleItemBox'
import { RuleItemHeader } from './RuleItemHeader'

const DenseAlert = styled(Alert)(({ theme }) => ({
  padding: theme.spacing(0, 1),
}))

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

interface SelectorRuleItemProps {
  index: number
  name: IntegrationRuleItemNames
  control: Control<IntegrationInput>
  getErrorMessage: () => string | undefined
  onOpenSelector: (callback: (xpath: string) => void) => void
  remove: (index: number) => void
}

export const SelectorRuleItem = ({
  index,
  name,
  control,
  getErrorMessage,
  onOpenSelector,
  remove,
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
      <RuleItemHeader index={index} onDelete={() => remove(index)}>
        <IconButton
          onClick={() =>
            onOpenSelector((xpath) => {
              setValue(`${name}.selector.${index}.value`, xpath, {
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
      </RuleItemHeader>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Controller
          name={`${name}.selector.${index}.value`}
          control={control}
          render={({ field }) => (
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder='//div[@class="example"]'
              {...withStopPropagation()}
              {...field}
              error={!!getErrorMessage()}
              helperText={getErrorMessage()}
            />
          )}
        />
        <QuickCheckbox
          control={control}
          name={`${name}.selector.${index}.quick`}
        />
      </Stack>
      {matchText?.isMatch ? (
        matchText.text ? (
          <DenseAlert icon={false} severity="success">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="success.main"
              >
                {t(
                  'integrationPolicy.editor.selectorRuleItem.matched',
                  'Matched'
                )}
              </Typography>
              <Typography variant="subtitle2" noWrap title={matchText.text}>
                {matchText.text}
              </Typography>
            </Stack>
          </DenseAlert>
        ) : (
          <DenseAlert severity="warning">
            {t(
              'integrationPolicy.editor.selectorRuleItem.matchedButEmpty',
              'A node is found, but the text is empty'
            )}
          </DenseAlert>
        )
      ) : (
        <DenseAlert severity="error">
          {t(
            'integrationPolicy.editor.selectorRuleItem.invalidXPath',
            'The XPath is invalid or no node is matched'
          )}
        </DenseAlert>
      )}
    </RuleItemBox>
  )
}
