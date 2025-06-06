import { useEffect } from 'react'

import { i18n } from '@/common/localization/i18n'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const SwitchLanguage = () => {
  const { data } = useExtensionOptions()

  useEffect(() => {
    void i18n.changeLanguage(data.lang)
  }, [data.lang])

  return null
}
