import { ExpandMore, Language as LanguageIcon } from '@mui/icons-material'
import { Box, Menu, MenuItem, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '@/common/localization/i18n'
import type { Language } from '@/common/localization/language'
import { LanguageList } from '@/common/localization/language'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { SettingsRow } from './SettingsGroup'

export const LanguageRow = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const currentLabel =
    LanguageList.find((lang) => lang.value === data.lang)?.label ?? data.lang

  const handleSelect = async (lang: Language) => {
    setAnchorEl(null)
    await partialUpdate({ lang })
    await i18n.changeLanguage(lang)
  }

  return (
    <>
      <SettingsRow
        icon={<LanguageIcon fontSize="small" />}
        title={t('optionsPage.language', 'Language')}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        right={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">{currentLabel}</Typography>
            <ExpandMore fontSize="small" />
          </Box>
        }
      />
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
      >
        {LanguageList.map((lang) => (
          <MenuItem
            key={lang.value}
            selected={lang.value === data.lang}
            onClick={() => handleSelect(lang.value)}
          >
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
