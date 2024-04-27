import { ChevronLeft } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useToast } from '@/common/components/toast/toastStore'
import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpc/client'
import { manualDanmakuCreateSchema } from '@/common/types/danmaku/schema'
import { tryCatch } from '@/common/utils/utils'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const UploadPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const [showResult, setShowResult] = useState(false)

  const queryClient = useQueryClient()

  const { mutate: handleParse, data } = useMutation({
    mutationFn: async () => {
      const [fileHandles, fileErr] = await tryCatch(() =>
        showOpenFilePicker({
          types: [
            {
              description: 'JSON files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
          multiple: true,
          excludeAcceptAllOption: true,
        })
      )

      // ignore error with no file selected
      if (fileErr) return null

      const res = await Promise.all(
        fileHandles.map(async (fileHandle) => {
          const json = await (await fileHandle.getFile()).text()

          const parseResult = manualDanmakuCreateSchema.safeParse(
            JSON.parse(json)
          )

          return parseResult
        })
      )

      const succeeded = res
        .map((result) => {
          if (result.success) return result.data
          return null
        })
        .filter(
          (result): result is Exclude<typeof result, null> => result !== null
        )

      const errored = res
        .map((result) => {
          if (result.success) return null
          return result.error
        })
        .filter(
          (result): result is Exclude<typeof result, null> => result !== null
        )

      return {
        succeeded,
        errored,
      } as const
    },
    onError: (e) => {
      toast.error(e.message)
    },
    onSuccess: (data) => {
      if (data) setShowResult(true)
    },
  })

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationFn: async () => {
      if (!data) return

      return chromeRpcClient.danmakuCreateManual(data.succeeded)
    },
    onSuccess: () => {
      toast.success(t('danmakuPage.uploadSuccess'))
      setShowResult(false)
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })

  const successUploads = data?.succeeded
  const errorUploads = data?.errored

  return (
    <TabLayout>
      <TabToolbar
        title={t('danmakuPage.upload')}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      />
      <Box>
        <Button onClick={() => handleParse()}>{t('danmaku.upload')}</Button>
      </Box>
      <Dialog open={showResult} onClose={() => setShowResult(false)}>
        <DialogTitle>{t('danmakuPage.confirmUploadTitle')}</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {t('danmakuPage.uploadResultSuccess')}
          </DialogContentText>
          {successUploads?.map((result, index) => {
            return (
              <DialogContentText key={index}>
                {result.animeTitle} -{' '}
                {result.episodeTitle ?? result.episodeNumber}
              </DialogContentText>
            )
          })}
          <DialogContentText>
            {t('danmakuPage.uploadResultError')}
          </DialogContentText>
          {errorUploads?.map((result, index) => {
            return (
              <DialogContentText key={index}>
                {result.message}
              </DialogContentText>
            )
          })}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowResult(false)}
            autoFocus
            disabled={isUploading}
          >
            {t('common.cancel')}
          </Button>
          <LoadingButton
            onClick={() => handleUpload()}
            color="success"
            loading={isUploading}
          >
            {t('danmakuPage.confirmUpdate')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </TabLayout>
  )
}
