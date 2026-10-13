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
import { describeCode, describeError } from '@/common/errors/describeError'
import { validateImportUrl } from './fetchUrlAsFile'

type UrlImportDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit: (url: string, signal: AbortSignal) => Promise<void>
}

export function UrlImportDialog({
  open,
  onClose,
  onSubmit,
}: UrlImportDialogProps) {
  const { t } = useTranslation()
  const dialogContainer = useDialogStore.use.container()

  const [url, setUrl] = useState('')
  const [error, setError] = useState<unknown>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const controller = new AbortController()
      controllerRef.current = controller
      await onSubmit(value, controller.signal)
    },
    onError: setError,
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

  const errorText = describeDisplayedError()

  function describeDisplayedError(): string | null {
    if (error !== null) {
      return describeError(error).message
    }
    if (url.length > 0 && !validation.ok) {
      return describeCode(validation.reason)
    }
    return null
  }

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
      <DialogTitle data-testid="url-import-title">
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
          error={errorText !== null}
          helperText={
            <span data-testid="url-import-helper">
              {errorText ??
                t(
                  'importPage.urlDialog.urlHelper',
                  'Direct link to a .json, .xml, .bin, or .zip file'
                )}
            </span>
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
