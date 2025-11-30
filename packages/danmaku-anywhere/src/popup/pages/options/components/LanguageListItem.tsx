import { ListItem, ListItemText, MenuItem, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { i18n } from '@/common/localization/i18n'
import type { Language } from '@/common/localization/language'
import { LanguageList } from '@/common/localization/language'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const LanguageListItem = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const handleSelect = async (lang: Language) => {
    await partialUpdate({ lang })
    await i18n.changeLanguage(lang)
  }

  return (
    <ListItem
      secondaryAction={
        <TextField
          size="small"
          sx={{ width: 150 }}
          label={t('optionsPage.language', 'Language')}
          value={data.lang}
          onChange={(e) => handleSelect(e.target.value as Language)}
          select
        >
          {LanguageList.map((lang) => (
            <MenuItem value={lang.value} key={lang.label}>
              {lang.label}
            </MenuItem>
          ))}
        </TextField>
      }
    >
      <ListItemText primary={t('optionsPage.language', 'Language')} />
    </ListItem>
  )
}
