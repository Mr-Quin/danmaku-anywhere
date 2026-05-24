import { Close, DragIndicator, Settings } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { createVirtualElement } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import { DraggableContainer } from '@/content/controller/ui/components/DraggableContainer'
import { AddFieldRow } from './AddFieldRow'
import { extractFieldValue } from './extractFieldValue'
import { FIELD_ORDER, type FieldId, getFieldLabel } from './fields'
import { PickedFieldRow } from './PickedFieldRow'
import { RefinePopper } from './RefinePopper'
import { useEditModeDrawerPosition } from './useEditModeDrawerPosition'
import { useEditModeDraft } from './useEditModeIntegration'

const DRAWER_WIDTH = 340

function useDrawerAnchor() {
  const ref = useRef(
    createVirtualElement(
      window.innerWidth - DRAWER_WIDTH - 16,
      window.innerHeight - 16
    )
  )
  return ref.current
}

export function EditModeDrawer() {
  const { t } = useTranslation()
  const theme = useTheme()
  const editMode = useStore.use.editMode()
  const pickTarget = useStore((s) => s.editMode.pickTarget)
  const { toggleEditor } = useStore.use.integrationForm()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { draft, isDirty, save, discard, clearFieldSelector } =
    useEditModeDraft()

  const anchorEl = useDrawerAnchor()
  const { initialOffset, handleDragEnd } = useEditModeDrawerPosition({
    x: 0,
    y: 0,
  })

  const rowRefs = useRef(new Map<FieldId, HTMLElement>())

  const extractions = useMemo(() => {
    const result = new Map<FieldId, ReturnType<typeof extractFieldValue>>()
    for (const id of FIELD_ORDER) {
      result.set(id, extractFieldValue(draft?.policy, id))
    }
    return result
  }, [draft?.policy])

  const pickedIds = FIELD_ORDER.filter((id) => !!extractions.get(id)?.xpath)

  const titlePicked = pickedIds.includes('title')
  const optionalAvailable = (
    ['title', 'season', 'episode', 'episodeTitle'] as const
  ).filter((id) => !pickedIds.includes(id))

  const closeEditMode = () => {
    editMode.setActive(false)
  }

  const handleExit = () => {
    if (!isDirty) {
      closeEditMode()
      return
    }
    dialog.confirm({
      title: t('editMode.exit.confirmTitle', 'Discard unsaved changes?'),
      content: t(
        'editMode.exit.confirmBody',
        'Closing Edit Mode now will discard your unsaved picks and regex changes.'
      ),
      confirmText: t('editMode.exit.discardAndClose', 'Discard and close'),
      confirmButtonProps: { color: 'error', variant: 'contained' },
      onConfirm: () => {
        discard()
        closeEditMode()
      },
    })
  }

  const handleSave = async () => {
    try {
      await save()
      toast.success(t('editMode.save.success', 'Saved'))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleOpenAdvanced = () => {
    const open = () => {
      editMode.setActive(false)
      toggleEditor(true)
    }
    if (!isDirty) {
      open()
      return
    }
    dialog.confirm({
      title: t('editMode.exit.confirmTitle', 'Discard unsaved changes?'),
      content: t(
        'editMode.exit.confirmAdvancedBody',
        'Opening the Advanced Editor will discard your unsaved Edit Mode changes.'
      ),
      confirmText: t(
        'editMode.exit.discardAndOpenAdvanced',
        'Discard and open'
      ),
      confirmButtonProps: { color: 'error', variant: 'contained' },
      onConfirm: () => {
        discard()
        open()
      },
    })
  }

  const handlePick = (fieldId: FieldId) => {
    editMode.setPickTarget(fieldId)
  }

  const handleRemove = (fieldId: FieldId) => {
    clearFieldSelector(fieldId)
    if (editMode.refiningId === fieldId) {
      editMode.setRefiningId(null)
    }
  }

  const refiningAnchor = editMode.refiningId
    ? rowRefs.current.get(editMode.refiningId)
    : null
  const refiningExtraction = editMode.refiningId
    ? (extractions.get(editMode.refiningId) ?? null)
    : null

  if (!draft || pickTarget !== null) {
    return null
  }

  return (
    <DraggableContainer
      anchorEl={anchorEl}
      initialOffset={initialOffset}
      onDragEnd={handleDragEnd}
      sx={{ zIndex: 2147483642 }}
    >
      {({ bind, isDragging }) => (
        <Box
          sx={{
            width: DRAWER_WIDTH,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            backdropFilter: 'blur(16px) saturate(140%)',
            boxShadow:
              '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 8px -2px rgba(0,0,0,0.3)',
            color: 'text.primary',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            {...bind()}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 0.5,
              cursor: isDragging ? 'grabbing' : 'grab',
              color: 'text.secondary',
              touchAction: 'none',
              borderBottom: `1px solid ${theme.palette.divider}`,
              '&:hover': { color: 'text.primary' },
            }}
          >
            <DragIndicator fontSize="small" />
          </Box>

          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {t('editMode.title', 'Edit XPath')}
              </Typography>
              {isDirty && (
                <Chip
                  size="small"
                  color="warning"
                  label={t('editMode.unsaved', 'UNSAVED')}
                />
              )}
              <Tooltip title={t('editMode.advanced', 'Advanced editor')}>
                <IconButton size="small" onClick={handleOpenAdvanced}>
                  <Settings fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.close', 'Close')}>
                <IconButton size="small" onClick={handleExit}>
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            {titlePicked ? (
              <Alert severity="success" icon={false} sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {extractions.get('title')?.parsed ||
                    t('editMode.status.titleSet', 'Title configured')}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" icon={false} sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('editMode.status.empty', 'Pick a title to begin')}
                </Typography>
              </Alert>
            )}

            {pickedIds.length > 0 && (
              <Stack spacing={1}>
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
                        onRemove={() => handleRemove(id)}
                      />
                    </Box>
                  )
                })}
              </Stack>
            )}

            {optionalAvailable.length > 0 && (
              <AddFieldRow available={optionalAvailable} onPick={handlePick} />
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              px: 2,
              py: 1.25,
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: 'paperAlt',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDirty ? 'warning.main' : 'text.secondary',
                fontWeight: 600,
                flexGrow: 1,
              }}
            >
              {isDirty
                ? t('editMode.footer.unsaved', 'Unsaved changes')
                : t('editMode.footer.saved', 'No unsaved changes')}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={discard}
              disabled={!isDirty}
            >
              {t('common.discard', 'Discard')}
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => {
                void handleSave()
              }}
              disabled={!isDirty}
            >
              {t('common.save', 'Save')}
            </Button>
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
