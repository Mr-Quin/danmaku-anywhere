import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material'
import type {
  Control,
  ControllerRenderProps,
  UseFormWatch,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import type { AutomationMode } from '@/common/options/mountConfig/schema'
import { EMPTY_INTEGRATION_VALUE } from '../emptyIntegrationValue.constant'
import type { MountConfigForm } from './types'

interface MountConfigAutomationStepProps {
  control: Control<MountConfigForm>
  watch: UseFormWatch<MountConfigForm>
  isPermissive: boolean
}

const AutomationCard = ({
  mode,
  field,
  disabled,
}: {
  mode: AutomationMode
  field: ControllerRenderProps<MountConfigForm, 'mode'>
  disabled?: boolean
}) => {
  const data = integrationData[mode]

  return (
    <Card
      variant="outlined"
      sx={{
        backgroundColor: 'transparent',
        borderColor: field.value === mode ? 'primary.main' : undefined,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <CardActionArea onClick={() => field.onChange(mode)} disabled={disabled}>
        <CardContent>
          <Radio
            checked={field.value === mode}
            value={mode}
            sx={{ visibility: 'hidden', position: 'absolute' }}
          />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <data.icon />
              <Typography variant="subtitle1" fontWeight="bold">
                {data.label()}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {data.description()}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export const MountConfigAutomationStep = ({
  control,
  watch,
  isPermissive,
}: MountConfigAutomationStepProps) => {
  const { t } = useTranslation()

  const selectedMode = watch('mode')
  const integration = watch('integration')
  console.log(integration)

  return (
    <Stack spacing={1}>
      <Typography variant="body1">
        {t('configPage.editor.automation.title', 'Select Automation Method')}
      </Typography>
      <Controller
        name="mode"
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} row={false}>
            <Stack spacing={1}>
              <AutomationCard mode="manual" field={field} />
              <AutomationCard mode="ai" field={field} disabled={isPermissive} />
              <AutomationCard mode="custom" field={field} />
            </Stack>
          </RadioGroup>
        )}
      />
      {selectedMode === 'custom' &&
        (!integration || integration === EMPTY_INTEGRATION_VALUE) && (
          <Alert severity="warning">
            {t(
              'configPage.editor.automation.xPathAlert',
              "You'll need to visit this site after saving to complete the setup using the on-page tool."
            )}
          </Alert>
        )}
    </Stack>
  )
}
