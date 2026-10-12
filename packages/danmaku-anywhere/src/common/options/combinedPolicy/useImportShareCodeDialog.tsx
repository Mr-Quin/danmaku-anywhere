import { TextField } from '@mui/material'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { useInjectService } from '@/common/hooks/useInjectService'
import { CombinedPolicyService } from '@/common/options/combinedPolicy/index'
import { InvalidShareCodeError } from '@/common/options/combinedPolicy/shareSchema'
import { serializeError } from '@/common/utils/serializeError'

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

  const invalidCodeMessage = () => {
    return t('configPage.import.invalidCode', 'This share code is not valid')
  }

  return () => {
    codeRef.current = ''
    dialog.confirm({
      title: t('configPage.importShareCode', 'Import Share Code'),
      content: (
        <TextField
          autoFocus
          slotProps={{ htmlInput: { 'data-testid': 'share-code-input' } }}
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
        const code = codeRef.current.trim()
        if (!code) {
          toast.error(invalidCodeMessage())
          return false
        }
        try {
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
          if (e instanceof InvalidShareCodeError) {
            toast.error(invalidCodeMessage())
            return false
          }
          toast.error(
            t('configPage.import.error', 'Import failed: {{message}}', {
              message: serializeError(e).message,
            })
          )
        }
      },
    })
  }
}
