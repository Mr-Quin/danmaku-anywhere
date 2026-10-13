import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { describeError } from '@/common/errors/describeError'
import { useInjectService } from '@/common/hooks/useInjectService'
import { CombinedPolicyService } from '@/common/options/combinedPolicy/index'
import type { MountConfig } from '../mountConfig/schema'

export function useExportShareCode() {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const combinedPolicyService = useInjectService(CombinedPolicyService)

  const handleExportShare = async (config: MountConfig) => {
    try {
      const code = await combinedPolicyService.exportShareCode(config.id)
      await navigator.clipboard.writeText(code)
      toast.success(t('common.copiedToClipboard', 'Copied to clipboard'))
    } catch (e) {
      toast.error(describeError(e).message)
    }
  }

  return handleExportShare
}
