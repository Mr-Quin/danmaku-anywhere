import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogStore } from '@/common/components/Dialog/dialogStore'
import {
  ImportFromUrlError,
  type ImportFromUrlErrorCode,
  validateImportUrl,
} from './fetchUrlAsFile'

type UrlImportDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit: (url: string, signal: AbortSignal) => Promise<void>
}

type DisplayedErrorCode = Exclude<ImportFromUrlErrorCode, 'aborted'>

type DisplayedError = {
  code: DisplayedErrorCode
  params: Record<string, string | number>
}

// Static key declarations for i18next-cli (it doesn't trace t(map[var])):
// t('importPage.urlDialog.errors.invalid_url', 'Not a valid URL.')
// t('importPage.urlDialog.errors.invalid_scheme', 'Only http and https URLs are supported.')
// t('importPage.urlDialog.errors.unsupported_extension', 'URL must point to a .json, .xml, .bin, or .zip file.')
// t('importPage.urlDialog.errors.fetch_failed', 'Failed to fetch the URL.')
// t('importPage.urlDialog.errors.http_error', 'Server returned {{status}}.')
// t('importPage.urlDialog.errors.size_limit_exceeded', 'File is larger than the {{limit}} limit.')
const ERROR_MESSAGE_KEY: Record<DisplayedErrorCode, string> = {
  invalid_url: 'importPage.urlDialog.errors.invalid_url',
  invalid_scheme: 'importPage.urlDialog.errors.invalid_scheme',
  unsupported_extension: 'importPage.urlDialog.errors.unsupported_extension',
  fetch_failed: 'importPage.urlDialog.errors.fetch_failed',
  http_error: 'importPage.urlDialog.errors.http_error',
  size_limit_exceeded: 'importPage.urlDialog.errors.size_limit_exceeded',
}

export function UrlImportDialog({
  open,
  onClose,
  onSubmit,
}: UrlImportDialogProps) {
  const { t } = useTranslation()
  const dialogContainer = useDialogStore.use.container()

  const [url, setUrl] = useState('')
  const [error, setError] = useState<DisplayedError | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const controller = new AbortController()
      controllerRef.current = controller
      await onSubmit(value, controller.signal)
    },
    onError: (err) => {
      if (err instanceof ImportFromUrlError) {
        if (err.code !== 'aborted') {
          setError({ code: err.code, params: err.params })
        }
        return
      }
      setError({ code: 'fetch_failed', params: {} })
    },
  })

  useEffect(() => {
    if (open) {
      setUrl('')
      setError(null)
      controllerRef.current = null
      mutation.reset()
    }
  }, [open])

  const validation = validateImportUrl(url)
  const canSubmit = url.length > 0 && validation.ok && !mutation.isPending

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }
    setError(null)
    mutation.mutate(url)
  }

  const handleClose = () => {
    if (mutation.isPending) {
      controllerRef.current?.abort()
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      onClose={handleClose}
      container={dialogContainer}
    >
      <DialogTitle>
        {t('importPage.urlDialog.title', 'Import from URL')}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('importPage.urlDialog.urlLabel', 'URL')}
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) {
              setError(null)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          error={error !== null}
          helperText={
            error
              ? t(ERROR_MESSAGE_KEY[error.code], error.params)
              : t(
                  'importPage.urlDialog.urlHelper',
                  'Direct link to a .json, .xml, .bin, or .zip file'
                )
          }
          disabled={mutation.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!canSubmit}
          loading={mutation.isPending}
        >
          {t('importPage.urlDialog.submit', 'Fetch & Import')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
