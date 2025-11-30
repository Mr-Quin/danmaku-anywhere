import { AutoAwesome, Build, TouchApp } from '@mui/icons-material'
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
import type { ReactNode } from 'react'
import type {
  Control,
  ControllerRenderProps,
  UseFormWatch,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { i18n } from '@/common/localization/i18n'
import type { AutomationMode } from '@/common/options/mountConfig/schema'
import type { MountConfigForm } from './types'

interface MountConfigAutomationStepProps {
  control: Control<MountConfigForm>
  watch: UseFormWatch<MountConfigForm>
  isPermissive: boolean
}

type CardDataMap = {
  [key in AutomationMode]: {
    label: string
    description: string
    icon: () => ReactNode
  }
}

const cardData: CardDataMap = {
  manual: {
    label: i18n.t('configPage.editor.automation.manualLabel', 'Manual'),
    description: i18n.t(
      'configPage.editor.automation.manualDescription',
      "I'll select danmaku manually from library"
    ),
    icon: () => <TouchApp />,
  },
  ai: {
    label: i18n.t('configPage.editor.automation.aiLabel', 'AI'),
    description: i18n.t(
      'configPage.editor.automation.aiDescription',
      'Let AI detect video info automatically'
    ),
    icon: () => <AutoAwesome />,
  },
  custom: {
    label: i18n.t('configPage.editor.automation.customLabel', 'Custom Rules'),
    description: i18n.t(
      'configPage.editor.automation.customDescription',
      "I'll create custom XPath rules to extract video info (requires visiting site)"
    ),
    icon: () => <Build />,
  },
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
  const data = cardData[mode]

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
              {data.icon()}
              <Typography variant="subtitle1" fontWeight="bold">
                {data.label}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {data.description}
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

      {selectedMode === 'custom' && (
        <Alert severity="warning">
          {t(
            'configPage.editor.automation.customAlert',
            "You'll need to visit this site after saving to complete the setup using the on-page tool."
          )}
        </Alert>
      )}
    </Stack>
  )
}
