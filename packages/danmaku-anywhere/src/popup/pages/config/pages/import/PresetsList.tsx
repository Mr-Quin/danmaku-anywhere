import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { NothingHere } from '@/common/components/NothingHere'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  type CombinedPolicy,
  combinedPolicyService,
} from '@/common/options/combinedPolicy'
import { configQueryKeys } from '@/common/queries/queryKeys'
import { PreFormat } from '@/popup/component/PreFormat'
import { CheckCircle } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type MountConfigPreset = { config: CombinedPolicy; hash: string; file: string }

type ConfigPresets = {
  time: number
  configs: {
    mount: MountConfigPreset[]
  }
}

export const PresetsList = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const {
    data: presets,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: configQueryKeys.presets(),
    queryFn: async (): Promise<ConfigPresets> => {
      const res = await fetch('https://danmaku-config.weeblify.app/config.json')
      return res.json()
    },
    select: (data) => {
      return data.configs.mount
    },
  })
  const [selectedPreset, setSelectedPreset] = useState<CombinedPolicy | null>(
    null
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const importMutation = useMutation({
    mutationFn: async (preset: unknown) => {
      return combinedPolicyService.import(preset)
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  const handlePresetClick = (preset: CombinedPolicy) => {
    setSelectedPreset(preset)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  const handleImport = () => {
    if (selectedPreset) {
      importMutation.mutate(selectedPreset)
      setDialogOpen(false)
    }
  }

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (isError) {
    return <ErrorMessage message={error.message} />
  }

  if (!presets || presets.length === 0) {
    return <NothingHere />
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('configPage.editor.name'),
      flex: 1,
    },
    {
      field: 'description',
      headerName: t('configPage.editor.description'),
      flex: 2,
    },
    {
      field: 'hasIntegration',
      headerName: t('configPage.import.hasIntegration'),
      flex: 1,
      renderCell: (params) => {
        return params.value ? (
          <Box display="flex" alignItems="center" height="100%">
            <CheckCircle color="success" />
          </Box>
        ) : null
      },
    },
  ]

  const rows = presets.map(({ config }) => ({
    id: config.id,
    name: config.name,
    description: config.description || '',
    hasIntegration: !!config.integration,
    config,
  }))

  return (
    <>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableColumnSelector
          disableRowSelectionOnClick
          onRowClick={(params) => handlePresetClick(params.row.config)}
          slots={{
            noRowsOverlay: () => <NothingHere />,
          }}
          sx={{
            background: 'none',
            border: 'none',
            '& .MuiDataGrid-cell': {
              cursor: 'pointer',
              '&:focus': {
                outline: 'none',
              },
            },
          }}
        />
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedPreset && (
          <>
            <DialogTitle>
              <Typography variant="h6" component="p">
                {selectedPreset.name}
              </Typography>
              {selectedPreset.author && (
                <Typography
                  variant="subtitle2"
                  component="p"
                  color="textSecondary"
                >
                  {selectedPreset.author}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent dividers>
              {selectedPreset.description && (
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  {selectedPreset.description}
                </Typography>
              )}

              {selectedPreset.integration && (
                <Typography variant="subtitle1" gutterBottom>
                  {t('configPage.import.hasIntegration')}
                </Typography>
              )}

              <Typography variant="subtitle1" gutterBottom>
                {t('configPage.editor.urlPatterns')}
              </Typography>
              <PreFormat disableCopy>
                {selectedPreset.patterns.map((pattern, i) => (
                  <li key={i}>{pattern}</li>
                ))}
              </PreFormat>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
              <Button
                onClick={handleImport}
                variant="contained"
                color="primary"
                disabled={importMutation.isPending}
              >
                {t('common.import')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}
