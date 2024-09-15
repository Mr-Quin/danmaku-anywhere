import { zodResolver } from '@hookform/resolvers/zod'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useToast } from '@/common/components/Toast/toastStore'
import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import { xpathPolicyItemSchema } from '@/common/options/xpathPolicyStore/schema'
import { useXPathPolicyStore } from '@/common/options/xpathPolicyStore/useXPathPolicyStore'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

interface IntegrationPolicyEditorProps {
  mode: 'add' | 'edit'
}

export const IntegrationPolicyEditor = ({
  mode,
}: IntegrationPolicyEditorProps) => {
  const { t } = useTranslation()
  const { update, add } = useXPathPolicyStore()
  const connected = useIsConnected()
  const goBack = useGoBack()

  const isEdit = mode === 'edit'
  const config = useLocation().state

  const {
    handleSubmit,
    register,
    reset,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<XPathPolicyItem>({
    values: config,
    resolver: zodResolver(xpathPolicyItemSchema),
  })

  const toast = useToast.use.toast()

  const { mutateAsync } = useMutation({
    mutationFn: async (data: XPathPolicyItem) => {
      if (isEdit) {
        return update(config.id, data)
      } else {
        return add(data)
      }
    },
    onSuccess: () => {
      if (isEdit) {
        toast.success(t('configs.alert.updated'))
      } else {
        toast.success(t('configs.alert.created'))
      }
      goBack()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const {
    mutate: test,
    data: testResult,
    isPending: isTesting,
  } = useMutation({
    mutationFn: () =>
      tabRpcClient.integrationPolicyTest(
        xpathPolicyItemSchema.parse(getValues())
      ),
  })

  return (
    <OptionsPageLayout direction="left">
      <OptionsPageToolBar
        title={
          isEdit
            ? t('integrationPolicyPage.editor.title.edit', {
                name: config.name,
              })
            : t('integrationPolicyPage.editor.title.create')
        }
      />
      <Box
        p={2}
        component="form"
        onSubmit={handleSubmit((data) => mutateAsync(data))}
      >
        <TextField
          label={t('integrationPolicyPage.editor.name')}
          variant="standard"
          fullWidth
          required
          {...register('name', { required: true })}
          error={!!errors.name}
          helperText={errors.name?.message}
          margin="none"
        />
        {/*Title*/}
        <TextField
          label={t('integrationPolicyPage.editor.titleField')}
          variant="standard"
          fullWidth
          required
          {...register('policy.title.selector', { required: true })}
          error={!!errors.policy?.title?.selector}
          helperText={errors.policy?.title?.selector?.message}
          margin="dense"
        />
        <TextField
          label={t('integrationPolicyPage.editor.titleRegex')}
          variant="standard"
          fullWidth
          {...register('policy.title.regex')}
          error={!!errors.policy?.title?.regex}
          helperText={errors.policy?.title?.regex?.message}
          margin="dense"
        />
        {/*Episode Number*/}
        <TextField
          label={t('integrationPolicyPage.editor.episodeNumber')}
          variant="standard"
          fullWidth
          required
          {...register('policy.episodeNumber.selector', { required: true })}
          error={!!errors.policy?.episodeNumber?.selector}
          helperText={errors.policy?.episodeNumber?.selector?.message}
          margin="dense"
        />
        <TextField
          label={t('integrationPolicyPage.editor.episodeNumberRegex')}
          variant="standard"
          fullWidth
          {...register('policy.episodeNumber.regex')}
          error={!!errors.policy?.episodeNumber?.regex}
          helperText={errors.policy?.episodeNumber?.regex?.message}
          margin="dense"
        />
        {/*Season Number*/}
        <TextField
          label={t('integrationPolicyPage.editor.seasonNumber')}
          variant="standard"
          fullWidth
          required
          {...register('policy.seasonNumber.selector', { required: true })}
          error={!!errors.policy?.seasonNumber?.selector}
          helperText={errors.policy?.seasonNumber?.selector?.message}
          margin="dense"
        />
        <TextField
          label={t('integrationPolicyPage.editor.seasonNumberRegex')}
          variant="standard"
          fullWidth
          {...register('policy.seasonNumber.regex')}
          error={!!errors.policy?.seasonNumber?.regex}
          helperText={errors.policy?.seasonNumber?.regex?.message}
          margin="dense"
        />
        {/*Episode Title*/}
        <TextField
          label={t('integrationPolicyPage.editor.episodeTitle')}
          variant="standard"
          fullWidth
          {...register('policy.episodeTitle.selector')}
          error={!!errors.policy?.episodeTitle?.selector}
          helperText={errors.policy?.episodeTitle?.selector?.message}
          margin="dense"
        />
        <TextField
          label={t('integrationPolicyPage.editor.episodeTitleRegex')}
          variant="standard"
          fullWidth
          {...register('policy.episodeTitle.regex')}
          error={!!errors.policy?.episodeTitle?.regex}
          helperText={errors.policy?.episodeTitle?.regex?.message}
          margin="dense"
        />
        {testResult && <pre>{JSON.stringify(testResult, null, 2)}</pre>}

        <div>
          {isEdit && (
            <Button
              variant="outlined"
              onClick={() => reset()}
              disabled={isSubmitting}
              sx={{ mr: 2 }}
            >
              {t('common.reset')}
            </Button>
          )}
          <LoadingButton
            variant="contained"
            color="primary"
            type="submit"
            loading={isSubmitting}
          >
            {t('common.save')}
          </LoadingButton>
          <LoadingButton
            variant="outlined"
            onClick={async () => {
              if (await trigger()) {
                test()
              }
            }}
            disabled={!connected}
            loading={isTesting}
          >
            {t('common.test')}
          </LoadingButton>
        </div>
      </Box>
    </OptionsPageLayout>
  )
}
