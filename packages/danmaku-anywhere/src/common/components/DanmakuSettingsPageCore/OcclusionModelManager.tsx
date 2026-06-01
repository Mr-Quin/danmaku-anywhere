import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Radio,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DEFAULT_MODEL_ID } from '@/common/models/baseline'
import type { ModelManagementState } from '@/common/models/dto'
import type { ModelEntry } from '@/common/models/schema'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const MODELS_QUERY_KEY = ['occlusionModels']

const webgpuAvailable = typeof navigator !== 'undefined' && 'gpu' in navigator

function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

interface OcclusionModelManagerProps {
  activeModelId: string
  onSetActive: (id: string) => void
}

export function OcclusionModelManager({
  activeModelId,
  onSetActive,
}: OcclusionModelManagerProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: MODELS_QUERY_KEY,
    queryFn: () => chromeRpcClient.occlusionGetModels(),
    select: (res) => res.data,
  })

  function applyState(state: ModelManagementState) {
    queryClient.setQueryData(MODELS_QUERY_KEY, { data: state })
  }

  const refresh = useMutation({
    mutationFn: () => chromeRpcClient.occlusionRefreshModels(),
    onSuccess: (res) => applyState(res.data),
    onError: () =>
      toast.error(
        t('stylePage.occlusionModels.refreshError', 'Failed to refresh models')
      ),
  })

  const download = useMutation({
    mutationFn: (id: string) => chromeRpcClient.occlusionDownloadModel({ id }),
    onSuccess: (res) => applyState(res.data),
    onError: () =>
      toast.error(
        t('stylePage.occlusionModels.downloadError', 'Failed to download model')
      ),
  })

  const remove = useMutation({
    mutationFn: (id: string) => chromeRpcClient.occlusionDeleteModel({ id }),
    onSuccess: (res, id) => {
      applyState(res.data)
      // Deleting the active model leaves nothing to run; fall back to default.
      if (id === activeModelId) {
        onSetActive(DEFAULT_MODEL_ID)
      }
    },
    onError: () =>
      toast.error(
        t('stylePage.occlusionModels.deleteError', 'Failed to delete model')
      ),
  })

  const models = data?.models ?? []
  const storageById = new Map(
    (data?.storage ?? []).map((entry) => [entry.id, entry.sizeBytes])
  )

  function labelOf(model: ModelEntry): string {
    return i18n.language.startsWith('zh') ? model.label.zh : model.label.en
  }

  return (
    <Stack useFlexGap spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          {t('stylePage.occlusionModels.title', 'Models')}
        </Typography>
        <Tooltip title={t('stylePage.occlusionModels.refresh', 'Refresh')}>
          <span>
            <IconButton
              size="small"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              aria-label={t('stylePage.occlusionModels.refresh', 'Refresh')}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {isLoading ? (
        <CircularProgress size={20} />
      ) : (
        models.map((model) => {
          const downloadedSize = storageById.get(model.id)
          const isDownloaded = downloadedSize !== undefined
          const isHosted = model.delivery === 'hosted'
          const isActive = model.id === activeModelId
          const blockedByWebgpu = model.requiresWebGpu && !webgpuAvailable
          const busy =
            (download.isPending && download.variables === model.id) ||
            (remove.isPending && remove.variables === model.id)

          return (
            <Stack
              key={model.id}
              direction="row"
              spacing={1}
              data-testid={`occlusion-model-${model.id}`}
              sx={{ alignItems: 'center' }}
            >
              <Radio
                size="small"
                checked={isActive}
                disabled={blockedByWebgpu}
                onChange={() => onSetActive(model.id)}
                slotProps={{
                  input: {
                    'aria-label': labelOf(model),
                  },
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {labelOf(model)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {modelStateText(t, {
                    isActive,
                    isHosted,
                    isDownloaded,
                    downloadedSize,
                    sizeBytes: model.sizeBytes,
                    blockedByWebgpu,
                  })}
                </Typography>
              </Box>
              <Chip
                size="small"
                variant="outlined"
                label={model.runtime}
                sx={{ flexShrink: 0 }}
              />
              {model.requiresWebGpu ? (
                <Chip
                  size="small"
                  color={webgpuAvailable ? 'default' : 'warning'}
                  label="WebGPU"
                  sx={{ flexShrink: 0 }}
                />
              ) : null}
              {isHosted ? (
                <Box sx={{ flexShrink: 0, minWidth: 88, textAlign: 'right' }}>
                  {busy ? (
                    <CircularProgress size={18} />
                  ) : isDownloaded ? (
                    <Button
                      size="small"
                      color="error"
                      data-testid={`occlusion-model-delete-${model.id}`}
                      onClick={() => remove.mutate(model.id)}
                    >
                      {t('stylePage.occlusionModels.delete', 'Delete')}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      data-testid={`occlusion-model-download-${model.id}`}
                      onClick={() => download.mutate(model.id)}
                    >
                      {t('stylePage.occlusionModels.download', 'Download')}
                    </Button>
                  )}
                </Box>
              ) : null}
            </Stack>
          )
        })
      )}
    </Stack>
  )
}

function modelStateText(
  t: ReturnType<typeof useTranslation>['t'],
  state: {
    isActive: boolean
    isHosted: boolean
    isDownloaded: boolean
    downloadedSize: number | undefined
    sizeBytes: number | undefined
    blockedByWebgpu: boolean
  }
): string {
  if (state.blockedByWebgpu) {
    return t(
      'stylePage.occlusionModels.needsWebgpu',
      'Needs a WebGPU-capable browser'
    )
  }
  if (state.isActive) {
    return t('stylePage.occlusionModels.active', 'Active')
  }
  if (!state.isHosted) {
    return t('stylePage.occlusionModels.builtIn', 'Built in')
  }
  if (state.isDownloaded && state.downloadedSize !== undefined) {
    return t('stylePage.occlusionModels.downloaded', {
      defaultValue: 'Downloaded ({{size}})',
      size: formatMb(state.downloadedSize),
    })
  }
  if (state.sizeBytes !== undefined) {
    return t('stylePage.occlusionModels.notDownloadedSize', {
      defaultValue: 'Not downloaded ({{size}})',
      size: formatMb(state.sizeBytes),
    })
  }
  return t('stylePage.occlusionModels.notDownloaded', 'Not downloaded')
}
