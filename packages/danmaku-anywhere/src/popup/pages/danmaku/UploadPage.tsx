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
import { customDanmakuCreateSchema } from '@/common/types/danmaku/schema'
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

          const parseResult = customDanmakuCreateSchema.safeParse(
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

      const errorCount = res
        .map((result) => {
          if (result.success) return null
          return result.error
        })
        .filter(
          (result): result is Exclude<typeof result, null> => result !== null
        ).length

      return {
        successCount: succeeded.length,
        succeeded,
        errorCount,
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

      return chromeRpcClient.danmakuCreateCustom(data.succeeded)
    },
    onSuccess: () => {
      toast.success(t('danmakuPage.upload.success'))
      setShowResult(false)
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })

  const successUploads = data?.succeeded
  const errorCount = data?.errorCount ?? 0
  const successCount = data?.successCount ?? 0

  return (
    <TabLayout>
      <TabToolbar
        title={t('danmakuPage.upload.upload')}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      />
      <Box p={2}>
        <Button onClick={() => handleParse()} variant="contained">
          {t('danmakuPage.upload.selectFile')}
        </Button>
      </Box>

      <Dialog open={showResult} onClose={() => setShowResult(false)}>
        <DialogTitle>{t('danmakuPage.upload.dialogTitle')}</DialogTitle>

        <DialogContent>
          {successCount > 0 && (
            <>
              <DialogContentText>
                {t('danmakuPage.upload.parsedEntries')}
              </DialogContentText>
              {successUploads?.map((result, index) => {
                return (
                  <DialogContentText key={index}>
                    {result.animeTitle} -{' '}
                    {result.episodeTitle ?? result.episodeNumber} (
                    {result.comments.length})
                  </DialogContentText>
                )
              })}
            </>
          )}
          {errorCount > 0 && (
            <DialogContentText
              sx={{
                color: 'warning.main',
              }}
            >
              {t('danmakuPage.upload.parseError', { count: errorCount })}
            </DialogContentText>
          )}
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
            variant="contained"
            color="success"
            loading={isUploading}
            disabled={!successCount}
          >
            {t('danmakuPage.upload.confirm')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </TabLayout>
  )
}
