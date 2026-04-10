import { Close } from '@mui/icons-material'
import { Alert, Box, Button, Collapse, IconButton } from '@mui/material'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useToast } from '@/common/components/Toast/toastStore'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import type { MountAvailability } from '@/popup/hooks/useMountAvailability'
import { useMountAvailability } from '@/popup/hooks/useMountAvailability'
import { useStore } from '@/popup/store'

export const MountAvailabilityBanner = (): ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast.use.toast()
  const { setEditingConfig } = useStore.use.config()
  const { update: updateMountConfig } = useEditMountConfig()

  const availability = useMountAvailability()

  const [dismissedKind, setDismissedKind] = useState<
    MountAvailability['kind'] | null
  >(null)

  // A new availability kind means a new reason to alert — clear any previous
  // dismissal so the user sees the new banner.
  useEffect(() => {
    if (dismissedKind !== null && dismissedKind !== availability.kind) {
      setDismissedKind(null)
    }
  }, [availability.kind, dismissedKind])

  const hasAlertableAvailability =
    availability.kind !== 'connected' && availability.kind !== 'pending'
  const showAlert =
    hasAlertableAvailability && dismissedKind !== availability.kind

  // Keep the last visible availability mounted so Collapse can animate the
  // alert out after the state flips back to connected/pending or after the
  // user dismisses it.
  const displayedAvailabilityRef = useRef<MountAvailability | null>(null)
  if (showAlert) {
    displayedAvailabilityRef.current = availability
  }
  const displayedAvailability = displayedAvailabilityRef.current

  const handleDismiss = () => {
    setDismissedKind(availability.kind)
  }

  const handleCreateMountConfig = () => {
    if (availability.kind !== 'noConfig') {
      return
    }
    setEditingConfig(
      createMountConfig({
        patterns: [availability.pattern],
        name: availability.name,
      })
    )
    navigate('/config/add')
  }

  const handleEnableMountConfig = (configId: string) => {
    updateMountConfig.mutate(
      { id: configId, config: { enabled: true } },
      {
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <Collapse in={showAlert} unmountOnExit>
      {displayedAvailability !== null &&
        renderAlertContent(displayedAvailability, {
          t,
          onDismiss: handleDismiss,
          onCreateMountConfig: handleCreateMountConfig,
          onEnableMountConfig: handleEnableMountConfig,
        })}
    </Collapse>
  )
}

interface RenderContext {
  t: ReturnType<typeof useTranslation>['t']
  onDismiss: () => void
  onCreateMountConfig: () => void
  onEnableMountConfig: (configId: string) => void
}

function renderAlertContent(
  av: MountAvailability,
  ctx: RenderContext
): ReactElement | null {
  const { t, onDismiss, onCreateMountConfig, onEnableMountConfig } = ctx

  if (av.kind === 'disabled') {
    return (
      <Alert severity="warning" square onClose={onDismiss}>
        {t('mountPage.alert.extensionDisabled', 'Danmaku Anywhere is disabled')}
      </Alert>
    )
  }
  if (av.kind === 'unsupported') {
    return (
      <Alert severity="warning" square onClose={onDismiss}>
        {t('mountPage.alert.pageUnsupported', 'This page cannot host danmaku')}
      </Alert>
    )
  }
  if (av.kind === 'disabledConfig') {
    return (
      <Alert
        severity="info"
        square
        action={
          <AlertActions t={t} onDismiss={onDismiss}>
            <Button
              onClick={() => onEnableMountConfig(av.configId)}
              size="small"
              color="inherit"
              variant="text"
            >
              {t('mountPage.alert.enableMountConfig', 'Enable config')}
            </Button>
          </AlertActions>
        }
      >
        {t(
          'mountPage.alert.disabledMountConfig',
          'Mount config "{{name}}" is disabled',
          { name: av.configName }
        )}
      </Alert>
    )
  }
  if (av.kind === 'noConfig') {
    return (
      <Alert
        severity="info"
        square
        action={
          <AlertActions t={t} onDismiss={onDismiss}>
            <Button
              onClick={onCreateMountConfig}
              size="small"
              color="inherit"
              variant="text"
            >
              {t('mountPage.alert.createMountConfig', 'Create mount config')}
            </Button>
          </AlertActions>
        }
      >
        {t('mountPage.alert.noMountConfig', 'No mount config for this site')}
      </Alert>
    )
  }
  return null
}

interface AlertActionsProps {
  t: ReturnType<typeof useTranslation>['t']
  onDismiss: () => void
  children: ReactElement
}

function AlertActions({ t, onDismiss, children }: AlertActionsProps) {
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      {children}
      <IconButton
        size="small"
        color="inherit"
        onClick={onDismiss}
        aria-label={t('common.close', 'Close')}
      >
        <Close fontSize="small" />
      </IconButton>
    </Box>
  )
}
