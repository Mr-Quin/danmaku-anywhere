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
import { i18n } from '@/common/localization/i18n'
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

const ERROR_MESSAGE: Record<
  DisplayedErrorCode,
  (params: Record<string, string | number>) => string
> = {
  invalidUrl: () =>
    i18n.t('importPage.urlDialog.errors.invalidUrl', 'Not a valid URL.'),
  invalidScheme: () =>
    i18n.t(
      'importPage.urlDialog.errors.invalidScheme',
      'Only http and https URLs are supported.'
    ),
  unsupportedExtension: () =>
    i18n.t(
      'importPage.urlDialog.errors.unsupportedExtension',
      'URL must point to a .json, .xml, .bin, or .zip file.'
    ),
  fetchFailed: () =>
    i18n.t(
      'importPage.urlDialog.errors.fetchFailed',
      'Failed to fetch the URL.'
    ),
  httpError: (params) =>
    i18n.t(
      'importPage.urlDialog.errors.httpError',
      'Server returned {{status}}.',
      params
    ),
  sizeLimitExceeded: (params) =>
    i18n.t(
      'importPage.urlDialog.errors.sizeLimitExceeded',
      'File is larger than the {{limit}} limit.',
      params
    ),
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
      setError({ code: 'fetchFailed', params: {} })
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

  // Surface validation errors inline once the user has typed something
  // invalid. The submit button is also disabled — this just tells them why.
  const validationError: DisplayedError | null =
    url.length > 0 && !validation.ok
      ? { code: validation.reason, params: {} }
      : null
  const displayedError = error ?? validationError

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
      <DialogTitle data-testid="url-import-dialog">
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
          error={displayedError !== null}
          helperText={
            displayedError
              ? ERROR_MESSAGE[displayedError.code](displayedError.params)
              : t(
                  'importPage.urlDialog.urlHelper',
                  'Direct link to a .json, .xml, .bin, or .zip file'
                )
          }
          disabled={mutation.isPending}
          slotProps={{ htmlInput: { 'data-testid': 'url-import-input' } }}
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
          data-testid="url-import-submit"
        >
          {t('importPage.urlDialog.submit', 'Fetch & Import')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
