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
import type { Control, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { MountConfigForm } from './types'

interface MountConfigAutomationStepProps {
  control: Control<MountConfigForm>
  watch: UseFormWatch<MountConfigForm>
}

export const MountConfigAutomationStep = ({
  control,
  watch,
}: MountConfigAutomationStepProps) => {
  return (
    <Stack spacing={3}>
      <Typography variant="h6">Select Automation Method</Typography>
      <Controller
        name="mode"
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} row={false}>
            <Stack spacing={2}>
              <Card
                variant={field.value === 'manual' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'manual' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'manual' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('manual')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'manual'} value="manual" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TouchApp />
                        <Typography variant="subtitle1" fontWeight="bold">
                          No - Manual only
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        I'll select danmaku manually from library or search
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>

              <Card
                variant={field.value === 'ai' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'ai' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'ai' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('ai')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'ai'} value="ai" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AutoAwesome color="secondary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Yes - Use AI
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Automatically detect video info using AI
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>

              <Card
                variant={field.value === 'custom' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'custom' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'custom' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('custom')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'custom'} value="custom" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Build color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Yes - Custom selectors
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Use element picker on the site (requires visiting site)
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Stack>
          </RadioGroup>
        )}
      />

      {watch('mode') === 'custom' && (
        <Alert severity="warning">
          You'll need to visit this site after saving to complete the setup
          using the on-page dropper tool.
        </Alert>
      )}
    </Stack>
  )
}
