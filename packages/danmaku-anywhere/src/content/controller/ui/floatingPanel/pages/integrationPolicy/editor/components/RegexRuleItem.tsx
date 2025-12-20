import { Stack, TextField } from '@mui/material'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import type { IntegrationRuleItemNames } from '../types'
import { QuickCheckbox } from './QuickCheckbox'
import { RuleItemBox } from './RuleItemBox'
import { RuleItemHeader } from './RuleItemHeader'

interface RegexRuleItemProps {
  index: number
  name: IntegrationRuleItemNames
  control: Control<IntegrationInput>
  remove: (index: number) => void
  getErrorMessage: () => string | undefined
}

export const RegexRuleItem = ({
  index,
  name,
  control,
  remove,
  getErrorMessage,
}: RegexRuleItemProps) => {
  return (
    <RuleItemBox>
      <RuleItemHeader index={index} onDelete={() => remove(index)} />
      <Stack direction="row" alignItems="center" spacing={1}>
        <Controller
          name={`${name}.regex.${index}.value`}
          control={control}
          render={({ field }) => (
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder=".*"
              {...withStopPropagation()}
              {...field}
              error={!!getErrorMessage()}
              helperText={getErrorMessage()}
            />
          )}
        />
        <QuickCheckbox
          control={control}
          name={`${name}.regex.${index}.quick`}
        />
      </Stack>
    </RuleItemBox>
  )
}
