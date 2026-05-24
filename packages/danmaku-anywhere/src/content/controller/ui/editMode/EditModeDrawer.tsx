import { CheckCircle, Close, OpenInNew, Settings } from '@mui/icons-material'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { createVirtualElement } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { DraggableContainer } from '@/content/controller/ui/components/DraggableContainer'
import { AddFieldRow } from './AddFieldRow'
import { extractFieldValue } from './extractFieldValue'
import { FIELD_ORDER, type FieldId, getFieldLabel } from './fields'
import { PickedFieldRow } from './PickedFieldRow'
import { RefinePopper } from './RefinePopper'
import { RequiredFieldEmpty } from './RequiredFieldEmpty'
import { useEditModeDrawerPosition } from './useEditModeDrawerPosition'
import { useEditModeIntegration } from './useEditModeIntegration'

const DRAWER_WIDTH = 296

function useDrawerAnchor() {
  const ref = useRef(
    createVirtualElement(
      window.innerWidth - DRAWER_WIDTH - 14,
      window.innerHeight - 14
    )
  )
  return ref.current
}

export function EditModeDrawer() {
  const { t } = useTranslation()
  const theme = useTheme()
  const integration = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const editMode = useStore.use.editMode()
  const { toggleEditor } = useStore.use.integrationForm()
  const toast = useToast.use.toast()
  const { clearFieldSelector } = useEditModeIntegration()

  const anchorEl = useDrawerAnchor()
  const { initialOffset, handleDragEnd } = useEditModeDrawerPosition({
    x: 0,
    y: 0,
  })

  const rowRefs = useRef(new Map<FieldId, HTMLElement>())

  const extractions = useMemo(() => {
    const result = new Map<FieldId, ReturnType<typeof extractFieldValue>>()
    for (const id of FIELD_ORDER) {
      result.set(id, extractFieldValue(integration, id))
    }
    return result
  }, [integration])

  const pickedIds = FIELD_ORDER.filter((id) => {
    const xpath = extractions.get(id)?.xpath
    return !!xpath
  })

  const titlePicked = pickedIds.includes('title')
  const optionalAvailable = (
    ['season', 'episode', 'episodeTitle'] as const
  ).filter((id) => !pickedIds.includes(id))

  const handleClose = () => {
    editMode.setActive(false)
  }

  const handleOpenAdvanced = () => {
    editMode.setActive(false)
    toggleEditor(true)
  }

  const handlePick = (fieldId: FieldId) => {
    editMode.setPickTarget(fieldId)
  }

  const handleRemove = async (fieldId: FieldId) => {
    try {
      await clearFieldSelector(fieldId)
      if (editMode.refiningId === fieldId) {
        editMode.setRefiningId(null)
      }
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const refiningAnchor = editMode.refiningId
    ? rowRefs.current.get(editMode.refiningId)
    : null
  const refiningExtraction = editMode.refiningId
    ? (extractions.get(editMode.refiningId) ?? null)
    : null

  return (
    <DraggableContainer
      anchorEl={anchorEl}
      initialOffset={initialOffset}
      onDragEnd={handleDragEnd}
      sx={{ zIndex: 1400 }}
    >
      {({ bind, isDragging }) => (
        <Box
          {...bind()}
          sx={{
            width: DRAWER_WIDTH,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            backdropFilter: 'blur(16px) saturate(140%)',
            boxShadow:
              '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 8px -2px rgba(0,0,0,0.3)',
            color: 'text.primary',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            touchAction: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <Stack direction="row" spacing={0.875} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: 0.625,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 9,
                letterSpacing: 0.3,
                flexShrink: 0,
              }}
            >
              DA
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('editMode.title', 'Edit XPath')}
            </Typography>
            {editMode.pickTarget && (
              <Chip
                size="small"
                color="primary"
                label={t('editMode.picking', 'PICKING')}
                sx={{
                  height: 18,
                  fontSize: 9,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={t('editMode.advanced', 'Advanced editor')}>
              <IconButton
                size="small"
                onClick={handleOpenAdvanced}
                sx={{ p: 0.5 }}
              >
                <Settings sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.close', 'Close')}>
              <IconButton size="small" onClick={handleClose} sx={{ p: 0.5 }}>
                <Close sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          {titlePicked ? (
            <Alert
              severity="success"
              icon={false}
              sx={{ py: 0.5, fontSize: 11.5, fontWeight: 600 }}
            >
              {t('editMode.status.matched', 'Configured for {{name}}', {
                name: integration?.name || activeConfig.name,
              })}
            </Alert>
          ) : (
            <Alert
              severity="warning"
              icon={false}
              sx={{ py: 0.5, fontSize: 11.5, fontWeight: 600 }}
            >
              {t('editMode.status.empty', 'Pick a title to begin')}
            </Alert>
          )}

          {pickedIds.length > 0 && (
            <Stack spacing={0.625}>
              {pickedIds.map((id) => {
                const extraction = extractions.get(id)
                if (!extraction) {
                  return null
                }
                return (
                  <Box
                    key={id}
                    ref={(node: HTMLElement | null) => {
                      if (node) {
                        rowRefs.current.set(id, node)
                      } else {
                        rowRefs.current.delete(id)
                      }
                    }}
                  >
                    <PickedFieldRow
                      fieldId={id}
                      label={getFieldLabel(t, id)}
                      color={theme.palette.fieldAccent[id]}
                      extraction={extraction}
                      refining={editMode.refiningId === id}
                      onRefine={() =>
                        editMode.setRefiningId(
                          editMode.refiningId === id ? null : id
                        )
                      }
                      onRepick={() => handlePick(id)}
                      onRemove={() => {
                        void handleRemove(id)
                      }}
                    />
                  </Box>
                )
              })}
            </Stack>
          )}

          {!titlePicked && (
            <RequiredFieldEmpty
              fieldLabel={getFieldLabel(t, 'title')}
              onClick={() => handlePick('title')}
            />
          )}

          {titlePicked && optionalAvailable.length > 0 && (
            <AddFieldRow available={optionalAvailable} onPick={handlePick} />
          )}

          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              pt: 0.75,
              borderTop: `1px solid ${theme.palette.divider}`,
              fontSize: 10.5,
              color: 'text.secondary',
            }}
          >
            <CheckCircle sx={{ fontSize: 11, color: 'success.main' }} />
            <Typography variant="caption" sx={{ fontSize: 10.5 }}>
              {t('editMode.footer.autosaved', 'Auto-saved')}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Box
              component="button"
              onClick={handleOpenAdvanced}
              sx={{
                background: 'transparent',
                border: 'none',
                color: 'primary.main',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <OpenInNew sx={{ fontSize: 10 }} />
              {t('editMode.footer.advanced', 'Advanced')}
            </Box>
          </Stack>

          <RefinePopper
            open={!!editMode.refiningId && !!refiningAnchor}
            anchorEl={refiningAnchor ?? null}
            fieldId={editMode.refiningId}
            extraction={refiningExtraction}
            onClose={() => editMode.setRefiningId(null)}
          />
        </Box>
      )}
    </DraggableContainer>
  )
}
