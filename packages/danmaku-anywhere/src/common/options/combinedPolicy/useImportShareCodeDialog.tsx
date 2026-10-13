import { TextField } from '@mui/material'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { AppError } from '@/common/errors/AppError'
import { describeError } from '@/common/errors/describeError'
import { useInjectService } from '@/common/hooks/useInjectService'
import { CombinedPolicyService } from '@/common/options/combinedPolicy/index'

export const useImportShareCodeDialog = (
  options: { type: 'config' } | { type: 'integration'; configId: string } = {
    type: 'config',
  }
) => {
  const { t } = useTranslation()
  const dialog = useDialog()
  const toast = useToast.use.toast()
  const combinedPolicyService = useInjectService(CombinedPolicyService)

  const codeRef = useRef<string>('')

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
            codeRef.current = e.target.value
          }}
        />
      ),
      onConfirm: async () => {
        const code = codeRef.current
        try {
          if (!code) {
            throw new AppError('shareCode.invalid', {}, { message: 'No code' })
          }
          if (options.type === 'integration') {
            await combinedPolicyService.importShareCodeToConfig(
              code,
              options.configId
            )
          } else {
            await combinedPolicyService.importShareCode(code)
          }
          toast.success(t('configPage.import.success', 'Config imported'))
          codeRef.current = ''
        } catch (e) {
          toast.error(
            t('configPage.import.error', 'Import failed: {{message}}', {
              message: describeError(e).message,
            })
          )
        }
      },
    })
  }
}
