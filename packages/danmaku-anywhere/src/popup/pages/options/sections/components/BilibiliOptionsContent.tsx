import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const BilibiliOptionsContent = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { toast } = useToast()

  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(danmakuSourcesSchema),
    values: data.danmakuSources,
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  const submitMutation = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.bilibili = update.bilibili
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  return (
    <Stack gap={2}>
      <FormControl>
        <FormLabel>
          {t('optionsPage.danmakuSource.bilibili.danmakuTypePreference')}
        </FormLabel>
        <Controller
          name="bilibili.danmakuTypePreference"
          control={control}
          render={({ field }) => {
            return (
              <RadioGroup
                row
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                }}
              >
                <FormControlLabel value="xml" control={<Radio />} label="XML" />
                <FormControlLabel
                  value="protobuf"
                  control={<Radio />}
                  label="Protobuf"
                />
              </RadioGroup>
            )
          }}
        />
        <FormHelperText>
          {t(
            'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceXML'
          )}
        </FormHelperText>
        <FormHelperText>
          {t(
            'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceProtobuf'
          )}
        </FormHelperText>
      </FormControl>
      <Box>
        <Button
          onClick={handleSubmit((d) => {
            submitMutation.mutate(d)
          })}
          variant="contained"
          size="small"
          disabled={!formState.isDirty}
        >
          {t('common.apply')}
        </Button>
      </Box>
    </Stack>
  )
}
