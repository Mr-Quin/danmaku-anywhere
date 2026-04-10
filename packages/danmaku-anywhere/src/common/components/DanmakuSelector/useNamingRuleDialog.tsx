import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { NamingRuleDialogContent } from './NamingRuleDialogContent'

export const useNamingRuleDialog = () => {
  const { t } = useTranslation()
  const dialog = useDialog()

  return (folderPath: string, existingRule?: NamingRule) => {
    const dialogId = dialog.open({
      title: existingRule
        ? t('namingRule.edit', 'Edit Naming Rule')
        : t('namingRule.create', 'Create Naming Rule'),
      content: (
        <NamingRuleDialogContent
          folderPath={folderPath}
          existingRule={existingRule}
          onClose={() => dialog.close(dialogId)}
        />
      ),
      hideConfirm: true,
      hideCancel: true,
      dialogProps: {
        maxWidth: 'sm',
        fullWidth: true,
        sx: { zIndex: 1402 },
      },
    })
  }
}
