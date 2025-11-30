import { Autocomplete, Button, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'

export const IntegrationControl = () => {
  const { t } = useTranslation()

  const { toggleEditor } = useStore.use.integrationForm()

  const config = useActiveConfig()
  const { policies } = useIntegrationPolicyStore()
  const activeIntegration = useActiveIntegration()
  const { setIntegration } = useEditMountConfig()

  return (
    <>
      <Autocomplete
        fullWidth={false}
        renderInput={(params) => (
          <TextField {...params} label={t('integration.name', 'Integration')} />
        )}
        loading={setIntegration.isPending}
        options={policies}
        value={activeIntegration || null}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        onChange={(_, value) => {
          if (config) {
            setIntegration.mutate({
              configId: config.id,
              integrationId: value?.id ?? undefined,
            })
          }
        }}
        disablePortal
      />
      <Button variant="contained" onClick={() => toggleEditor()} sx={{ mt: 1 }}>
        {activeIntegration
          ? t('integrationPolicyPage.edit', 'Edit {{name}}', {
              name: activeIntegration.name,
            })
          : t('integrationPolicyPage.create', 'Add Integration Policy')}
      </Button>
    </>
  )
}
