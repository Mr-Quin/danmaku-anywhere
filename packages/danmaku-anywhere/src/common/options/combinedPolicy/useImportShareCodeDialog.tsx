import { TextField } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { useInjectService } from '@/common/hooks/useInjectService'
import { CombinedPolicyService } from '@/common/options/combinedPolicy/index'

export const useImportShareCodeDialog = () => {
  const { t } = useTranslation()
  const dialog = useDialog()
  const toast = useToast.use.toast()
  const combinedPolicyService = useInjectService(CombinedPolicyService)

  const [code, setCode] = useState<string>()

  return () => {
    dialog.confirm({
      title: t('configPage.importShareCode', 'Import Share Code'),
      content: (
        <TextField
          autoFocus
          margin="dense"
          placeholder={t(
            'configPage.importShareCodePlaceholder',
            'Paste code here'
          )}
          fullWidth
          variant="outlined"
          multiline
          rows={2}
          onChange={(e) => {
            setCode(e.target.value)
          }}
        />
      ),
      onConfirm: async () => {
        try {
          if (!code) return
          await combinedPolicyService.importShareCode(code)
          toast.success(t('configPage.import.success', 'Config imported'))
        } catch (e) {
          if (e instanceof Error) {
            toast.error(
              t('configPage.import.error', 'Import failed: {{message}}', {
                message: e.message,
              })
            )
          }
        }
      },
    })
  }
}
