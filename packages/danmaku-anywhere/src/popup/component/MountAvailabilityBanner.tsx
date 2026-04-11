import { Close } from '@mui/icons-material'
import type { AlertColor } from '@mui/material'
import { Alert, Box, Button, Collapse, IconButton } from '@mui/material'
import type { ReactElement } from 'react'
import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useToast } from '@/common/components/Toast/toastStore'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import type { MountAvailability } from '@/popup/hooks/useMountAvailability'
import { useMountAvailability } from '@/popup/hooks/useMountAvailability'
import { useStore } from '@/popup/store'

type TFunc = ReturnType<typeof useTranslation>['t']

interface AlertDescriptor {
  severity: AlertColor
  message: string
  cta?: {
    label: string
    onClick: () => void
  }
}

interface AlertContext {
  onCreateMountConfig: () => void
  onEnableMountConfig: (configId: string) => void
}

function describeAlert(
  av: MountAvailability,
  t: TFunc,
  ctx: AlertContext
): AlertDescriptor | null {
  switch (av.kind) {
    case 'connected':
    case 'pending':
      return null
    case 'disabled':
      return {
        severity: 'warning',
        message: t(
          'mountPage.alert.extensionDisabled',
          'Danmaku Anywhere is disabled'
        ),
      }
    case 'unsupported':
      return {
        severity: 'warning',
        message: t(
          'mountPage.alert.pageUnsupported',
          'This page cannot host danmaku'
        ),
      }
    case 'disabledConfig':
      return {
        severity: 'info',
        message: t(
          'mountPage.alert.disabledMountConfig',
          'Mount config "{{name}}" is disabled',
          { name: av.configName }
        ),
        cta: {
          label: t('mountPage.alert.enableMountConfig', 'Enable config'),
          onClick: () => ctx.onEnableMountConfig(av.configId),
        },
      }
    case 'noConfig':
      return {
        severity: 'info',
        message: t(
          'mountPage.alert.noMountConfig',
          'No mount config for this site'
        ),
        cta: {
          label: t('mountPage.alert.createMountConfig', 'Create mount config'),
          onClick: ctx.onCreateMountConfig,
        },
      }
  }
}

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
  const [displayedAvailability, setDisplayedAvailability] =
    useState<MountAvailability | null>(null)

  const shouldShow =
    availability.kind !== 'connected' &&
    availability.kind !== 'pending' &&
    dismissedKind !== availability.kind

  // Sync the displayed availability before paint so Collapse has content to
  // measure on the frame the banner opens. We clear on the Collapse onExited
  // callback below instead of tearing down mid-animation.
  useLayoutEffect(() => {
    if (dismissedKind !== null && dismissedKind !== availability.kind) {
      setDismissedKind(null)
    }
    if (shouldShow) {
      setDisplayedAvailability(availability)
    }
  }, [availability, dismissedKind, shouldShow])

  const handleDismiss = () => {
    setDismissedKind(availability.kind)
  }

  const handleExited = () => {
    setDisplayedAvailability(null)
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

  const descriptor = displayedAvailability
    ? describeAlert(displayedAvailability, t, {
        onCreateMountConfig: handleCreateMountConfig,
        onEnableMountConfig: handleEnableMountConfig,
      })
    : null

  return (
    <Collapse
      in={shouldShow && descriptor !== null}
      onExited={handleExited}
      // Pin to natural height in the popup's flex column — without this the
      // Box below (which has flexGrow=1) shrinks the banner by a couple of
      // pixels and the alert's bottom border clips into the content.
      sx={{ flexShrink: 0 }}
    >
      {descriptor && (
        <Alert
          severity={descriptor.severity}
          square
          action={
            <AlertActions
              t={t}
              onDismiss={handleDismiss}
              cta={descriptor.cta}
            />
          }
        >
          {descriptor.message}
        </Alert>
      )}
    </Collapse>
  )
}

interface AlertActionsProps {
  t: TFunc
  onDismiss: () => void
  cta?: AlertDescriptor['cta']
}

function AlertActions({ t, onDismiss, cta }: AlertActionsProps) {
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      {cta && (
        <Button
          onClick={cta.onClick}
          size="small"
          color="inherit"
          variant="text"
        >
          {cta.label}
        </Button>
      )}
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
