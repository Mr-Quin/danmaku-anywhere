import { DialogContentText } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ImportParseResult } from '@/common/danmaku/types'
import { CustomEpisodeInsertV4 } from '@/common/danmaku/types/v4/schema'
import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ImportResultDialog } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportResultDialog'

interface CustomDanmakuImportResultProps {
  data: ImportParseResult<CustomEpisodeInsertV4[]>
  onClose: () => void
  open: boolean
}

export const ImportCustomDanmaku = ({
  data,
  open,
  onClose,
}: CustomDanmakuImportResultProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationKey: episodeQueryKeys.all(),
    mutationFn: async () => {
      if (!data) return

      return chromeRpcClient.danmakuCreateCustom(data.succeeded)
    },
    onSuccess: () => {
      toast.success(t('danmakuPage.upload.success'))
      onClose()
    },
    onError: (e) => {
      Logger.debug('Error importing danmaku:', e)
      toast.error(e.message)
    },
    meta: {
      invalidateOnError: true,
    },
  })

  return (
    <ImportResultDialog
      open={open}
      onClose={onClose}
      onSave={() => handleUpload()}
      disableSave={data.successCount === 0}
      isLoading={isUploading}
      errors={data.errors}
    >
      {data.successCount > 0 && (
        <>
          <DialogContentText>
            {t('danmakuPage.upload.parsedEntries')}
          </DialogContentText>
          {data.succeeded?.map((result, index) => {
            return (
              <DialogContentText key={index}>
                {result.title} ({result.comments.length})
              </DialogContentText>
            )
          })}
        </>
      )}
    </ImportResultDialog>
  )
}
