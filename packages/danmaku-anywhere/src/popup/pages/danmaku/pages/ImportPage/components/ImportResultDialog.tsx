import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ZodError } from 'zod'

type ImportResultDialogProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  onSave: () => void
  disableSave: boolean
  isLoading: boolean
  errors?: ZodError[]
  caption?: string
}>

export const ImportResultDialog = ({
  open,
  onSave,
  onClose,
  isLoading,
  disableSave,
  errors,
  children,
}: ImportResultDialogProps) => {
  const theme = useTheme()
  const { t } = useTranslation()

  const [collapseErrors, setCollapseErrors] = useState(false)

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('danmakuPage.upload.dialogTitle')}</DialogTitle>
      <DialogContent dividers>
        {errors && errors.length > 0 && (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography color="error.main">
                {t('danmakuPage.upload.parseError', { count: errors.length })}
              </Typography>
              <IconButton
                onClick={() => setCollapseErrors(!collapseErrors)}
                size="small"
              >
                {collapseErrors ? <ExpandMore /> : <ExpandLess />}
              </IconButton>
            </Stack>
            <Collapse in={!collapseErrors}>
              <Paper
                sx={{
                  p: 2,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                <pre
                  style={{
                    fontSize: theme.typography.caption.fontSize,
                    color: theme.palette.error.main,
                  }}
                >
                  {JSON.stringify(errors, null, 2)}
                </pre>
              </Paper>
            </Collapse>
          </>
        )}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <LoadingButton
          onClick={onSave}
          variant="contained"
          color="success"
          loading={isLoading}
          disabled={disableSave}
        >
          {t('danmakuPage.upload.confirm')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}
