import { GitHub } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { ExternalLink } from '@/common/components/ExternalLink'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useLatestReleaseNotes } from './useLatestReleaseNotes'

export const ReleaseNotes = () => {
  const { t } = useTranslation()
  const { partialUpdate, data: extensionOptions } = useExtensionOptions()
  const query = useLatestReleaseNotes()

  const [showDialog, setShowDialog] = useState(query.isSuccess)

  useEffect(() => {
    setShowDialog(query.isSuccess)
  }, [query.isSuccess])

  const handleClose = () => {
    setShowDialog(false)
    return partialUpdate({ showReleaseNotes: false })
  }

  if (!query.isSuccess) return null

  return (
    <Dialog
      open={showDialog && extensionOptions.showReleaseNotes}
      onClose={handleClose}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          {query.data.name}
          <ExternalLink
            to={query.data.html_url}
            target="_blank"
            rel="noreferrer"
            style={{ float: 'right', lineHeight: 0 }}
            icon={<GitHub fontSize="inherit" color="primary" />}
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          <Markdown urlTransform={(url) => url}>{query.data.body}</Markdown>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="success" variant="contained">
          {t('common.acknowledge', 'Ok')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
