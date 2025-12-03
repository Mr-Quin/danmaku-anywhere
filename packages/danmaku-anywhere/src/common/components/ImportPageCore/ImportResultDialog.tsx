import {
  Backdrop,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useDialogStore } from '../Dialog/dialogStore'
import { getScrollBarProps } from '../layout/ScrollBox'

export type UploadDialogStatus =
  | 'confirmUpload'
  | 'uploading'
  | 'uploadSuccess'
  | 'error'

export type ImportResultRenderParams<T> =
  | {
      status: 'confirmUpload'
      result: null
      error: null
    }
  | {
      status: 'uploading'
      result: null
      error: null
    }
  | {
      status: 'uploadSuccess'
      result: T
      error: null
    }
  | {
      status: 'error'
      result: null
      error: Error | null
    }

type ImportResultDialogProps<T> = {
  open: boolean
  title: string
  onClose: () => void
  onImport: () => Promise<T>
  disableImport?: boolean
  children?: (params: ImportResultRenderParams<T>) => ReactNode
}

export const ImportResultDialog = <T,>({
  open,
  title,
  onClose,
  onImport,
  disableImport,
  children,
}: ImportResultDialogProps<T>) => {
  const { t } = useTranslation()
  const dialogContainer = useDialogStore.use.container()
  const [status, setStatus] = useState<UploadDialogStatus>('confirmUpload')

  const { mutate, data, error, reset } = useMutation({
    mutationFn: async () => {
      return onImport()
    },
    onMutate: () => {
      setStatus('uploading')
    },
    onSuccess: () => {
      setStatus('uploadSuccess')
    },
    onError: () => {
      setStatus('error')
    },
  })

  useEffect(() => {
    if (open) {
      if (status === 'uploadSuccess' || status === 'error') {
        setStatus('confirmUpload')
        reset()
      }
    }
  }, [open])

  const handleClose = () => {
    onClose()
  }

  const renderParams = { status, error, result: data || null }

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      onClose={handleClose}
      container={dialogContainer}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers sx={(theme) => ({ ...getScrollBarProps(theme) })}>
        {children?.(renderParams as ImportResultRenderParams<T>)}
        <Backdrop open={status === 'uploading'}>
          <FullPageSpinner />
        </Backdrop>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          color="primary"
          disabled={status === 'uploading'}
        >
          {status === 'uploadSuccess' || status === 'error'
            ? t('common.close', 'Close')
            : t('common.cancel', 'Cancel')}
        </Button>
        {(status === 'confirmUpload' || status === 'uploading') && (
          <>
            <Button
              onClick={() => mutate()}
              variant="contained"
              color="primary"
              disabled={disableImport || status === 'uploading'}
              loading={status === 'uploading'}
            >
              {t('importPage.confirm', 'Confirm Import')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
