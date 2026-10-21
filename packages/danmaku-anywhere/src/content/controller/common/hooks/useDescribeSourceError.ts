import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { findSourceName } from '@/common/options/providerConfig/utils'
import { describeSourceError } from '@/common/providers/describeSourceError'
import { isUnreachableError } from '@/common/providers/SourceError'

interface SourceErrorInput {
  error: unknown
  describeFailure: (reason: string) => string
  providerConfigId?: string
}

export function useDescribeSourceError() {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()

  return useEventCallback(
    ({
      error,
      describeFailure,
      providerConfigId,
    }: SourceErrorInput): string => {
      if (!isUnreachableError(error)) {
        return describeFailure(describeSourceError(error))
      }

      const source = findSourceName(configs, providerConfigId)
      if (source === undefined) {
        return t(
          'integration.alert.sourceUnreachableUnnamed',
          "Couldn't reach the danmaku source"
        )
      }
      return t(
        'integration.alert.sourceUnreachable',
        "Couldn't reach {{source}}",
        { source }
      )
    }
  )
}
