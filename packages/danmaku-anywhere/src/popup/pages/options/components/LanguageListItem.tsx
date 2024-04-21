import {
  FormControl,
  InputLabel,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { i18n } from '@/common/localization/i18n'
import type { Language } from '@/common/localization/language'
import { LanguageList } from '@/common/localization/language'
import { useExtensionOptionsSuspense } from '@/common/options/extensionOptions/useExtensionOptionsSuspense'

export const LanguageListItem = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptionsSuspense()

  const handleSelect = async (lang: Language) => {
    await partialUpdate({ lang })
    await i18n.changeLanguage(lang)
  }

  return (
    <ListItem
      secondaryAction={
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>{t('optionsPage.language')}</InputLabel>
          <Select
            value={data.lang}
            onChange={(e) => handleSelect(e.target.value as Language)}
          >
            {LanguageList.map((lang) => (
              <MenuItem value={lang.value} key={lang.label}>
                {lang.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      }
    >
      <ListItemText primary={t('optionsPage.language')} />
    </ListItem>
  )
}
