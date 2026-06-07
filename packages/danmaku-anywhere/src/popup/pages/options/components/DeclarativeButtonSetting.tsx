import { FileUpload } from '@mui/icons-material'
import { Button, CircularProgress } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ButtonSettingConfig } from '@/common/settings/settingConfigs'
import { SettingsStaticRow } from './settings/SettingsGroup'

interface DeclarativeButtonSettingProps {
  config: ButtonSettingConfig
  isLoading?: boolean
}

export const DeclarativeButtonSetting = ({
  config,
  isLoading: isLoadingProp,
}: DeclarativeButtonSettingProps) => {
  const { t } = useTranslation()
  const [isLoadingState, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      await config.handler()
    } finally {
      setIsLoading(false)
    }
  }

  const isLoading = isLoadingState || isLoadingProp

  return (
    <SettingsStaticRow
      title={config.label()}
      subtitle={config.description?.()}
      right={
        <Button
          variant="soft"
          onClick={handleClick}
          disabled={isLoading}
          aria-label={config.label()}
          startIcon={
            isLoading ? <CircularProgress size={14} /> : <FileUpload />
          }
        >
          {t('optionsPage.submit', 'Submit')}
        </Button>
      }
    />
  )
}
