import { OpenInNew } from '@mui/icons-material'
import { Box, Button, Stack } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { OverlayLayout } from '@/common/components/layout/OverlayLayout'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import { MountConfigAiSettingsForm } from '@/common/options/mountConfig/components/MountConfigAiSettingsForm'
import {
  DEFAULT_MOUNT_CONFIG_AI_CONFIG,
  type MountConfigAiConfig,
  zMountConfigAiConfig,
} from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { docsLink } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const AiSettingsEditor = (): ReactElement => {
  const { t } = useTranslation()
  const activeConfig = useActiveConfig()
  const { toggleAiEditor } = useStore.use.integrationForm()
  const toast = useToast.use.toast()

  const [value, setValue] = useState<MountConfigAiConfig>(
    activeConfig.ai ?? DEFAULT_MOUNT_CONFIG_AI_CONFIG
  )

  const { update } = useEditMountConfig()

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const result = zMountConfigAiConfig.safeParse(value)
      if (!result.success) {
        throw new Error(result.error.message)
      }

      await update.mutateAsync({
        id: activeConfig.id,
        config: {
          ai: value,
        },
      })
    },
    onSuccess: () => {
      toast.success(t('configs.alert.updated'))
      toggleAiEditor(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <OverlayLayout>
      <TabLayout height="100%">
        <Stack height="100%" display="flex" flexDirection="column" spacing={0}>
          <TabToolbar
            title={t('ai.settings', 'AI Settings')}
            showBackButton
            onGoBack={() => toggleAiEditor(false)}
          >
            <div>
              <Button
                variant="text"
                component="a"
                href={docsLink('docs/integration/ai')}
                target="_blank"
              >
                {t('common.docs', 'Docs')}
                <OpenInNew fontSize="inherit" color="primary" />
              </Button>
            </div>
          </TabToolbar>

          <ScrollBox flexGrow={1} overflow="auto" minHeight={0}>
            <Box px={2} py={1}>
              <Suspense fallback={<FullPageSpinner />}>
                <MountConfigAiSettingsForm config={value} onChange={setValue} />
              </Suspense>
            </Box>
          </ScrollBox>

          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => toggleAiEditor(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => save()}
                loading={isPending}
                disabled={isPending}
              >
                {t('common.save', 'Save')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </TabLayout>
    </OverlayLayout>
  )
}
