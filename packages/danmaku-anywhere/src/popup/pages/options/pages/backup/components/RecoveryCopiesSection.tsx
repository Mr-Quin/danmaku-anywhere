import { Restore } from '@mui/icons-material'
import { Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { localizedStoreName } from '@/common/options/storeMessages'
import {
  OPTIONS_RECOVERY_KEY,
  type OptionsRecoveryCopy,
} from '@/common/options/upgrade/recoveryCopy'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { downloadRecoveryCopy } from '@/popup/component/downloadRecoveryCopy'
import {
  SettingsGroup,
  SettingsGroupLabel,
  SettingsStaticRow,
} from '@/popup/pages/options/components/settings/SettingsGroup'

const recoveryCopies = new ExtStorageService<OptionsRecoveryCopy[]>(
  OPTIONS_RECOVERY_KEY,
  { storageType: 'local' }
)

// What option stores held when the user reset them, newest first. Shown only
// once there is one.
export function RecoveryCopiesSection() {
  const { t, i18n } = useTranslation()
  const { data: copies = [] } = useQuery({
    queryKey: storageQueryKeys.external('local', [OPTIONS_RECOVERY_KEY]),
    queryFn: async () => (await recoveryCopies.read()) ?? [],
  })

  if (copies.length === 0) {
    return null
  }

  return (
    <>
      <SettingsGroupLabel>
        {t('optionsPage.backup.recoveryCopies', 'Recovery copies')}
      </SettingsGroupLabel>
      <SettingsGroup>
        {copies.toReversed().map((copy) => (
          <SettingsStaticRow
            key={copy.id}
            icon={<Restore fontSize="small" />}
            title={localizedStoreName(copy.store)}
            subtitle={t(
              'optionsPage.backup.recoveryCopySaved',
              'Saved before a reset on {{date}}',
              {
                date: new Date(copy.savedAt).toLocaleString(i18n.language),
              }
            )}
            right={
              <Button
                variant="soft"
                data-testid="recovery-copy-download"
                data-store={copy.store}
                onClick={() => void downloadRecoveryCopy(copy)}
              >
                {t('optionsPage.backup.export', 'Export')}
              </Button>
            }
          />
        ))}
      </SettingsGroup>
    </>
  )
}
