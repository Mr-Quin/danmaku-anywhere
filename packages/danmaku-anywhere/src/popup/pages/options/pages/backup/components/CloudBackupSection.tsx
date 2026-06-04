import { CloudUpload, InfoOutlined, Person } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useToast } from '@/common/components/Toast/toastStore'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import {
  SettingsGroup,
  SettingsGroupLabel,
} from '@/popup/pages/options/components/settings/SettingsGroup'
import { CloudBackupList } from './CloudBackupList'

export function CloudBackupSection({
  onRestoringChange,
}: {
  onRestoringChange?: (isRestoring: boolean) => void
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()

  const { data: session } = useAuthSession()
  const isSignedIn = !!session

  const {
    data: backups,
    refetch,
    isLoading: isLoadingBackups,
    isError: isBackupsError,
  } = useQuery({
    queryKey: ['cloudBackups', session?.user?.id],
    queryFn: async () => chromeRpcClient.cloudBackupList(),
    select: (res) => res.data,
    enabled: isSignedIn,
  })

  const importMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return await chromeRpcClient.backupImport(data)
    },
    onSuccess: () => {
      toast.success(
        t(
          'optionsPage.backup.alert.importSuccess',
          'Backup imported successfully'
        )
      )
    },
    onError: (error) => {
      toast.error(
        t('optionsPage.backup.importError', 'Import failed') +
          `: ${error.message}`
      )
    },
    onSettled: () => {
      onRestoringChange?.(false)
    },
  })

  const createCloudBackupMutation = useMutation({
    mutationFn: async () => chromeRpcClient.cloudBackupCreate(),
    onSuccess: () => {
      toast.success(
        t('optionsPage.backup.cloudCreateSuccess', 'Cloud backup created')
      )
      void refetch()
    },
    onError: (error) => {
      toast.error(
        t(
          'optionsPage.backup.cloudCreateError',
          'Cloud backup failed: {{message}}',
          { message: error.message }
        )
      )
    },
  })

  const downloadCloudBackupMutation = useMutation({
    mutationFn: async (id: string) => chromeRpcClient.cloudBackupDownload(id),
    onMutate: () => {
      onRestoringChange?.(true)
    },
    onSuccess: ({ data }) => {
      importMutation.mutate(data)
    },
    onError: (error) => {
      toast.error(
        t(
          'optionsPage.backup.cloudDownloadError',
          'Failed to download cloud backup: {{message}}',
          { message: error.message }
        )
      )
      onRestoringChange?.(false)
    },
  })

  const isRestoring =
    importMutation.isPending || downloadCloudBackupMutation.isPending

  const cloudLabel = (
    <SettingsGroupLabel>
      {t('optionsPage.backup.cloudBackup', 'Cloud Backup')}
    </SettingsGroupLabel>
  )

  if (!isSignedIn) {
    return (
      <>
        {cloudLabel}
        <Box
          sx={{
            mx: 1.5,
            p: 1.75,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoOutlined fontSize="small" sx={{ color: 'info.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t(
                'optionsPage.backup.cloudSignInTitle',
                'Sign in to enable cloud backup'
              )}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', mb: 1.5 }}
          >
            {t(
              'optionsPage.backup.cloudDescription',
              'Sync your settings to the cloud. Up to 3 revisions are kept.'
            )}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Person />}
            onClick={() => navigate('/options/auth')}
          >
            {t('optionsPage.backup.goToSignIn', 'Go to Sign In')}
          </Button>
        </Box>
      </>
    )
  }

  return (
    <>
      {cloudLabel}
      <Box sx={{ mx: 1.5, mb: 1.25 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={
            createCloudBackupMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CloudUpload />
            )
          }
          onClick={() => createCloudBackupMutation.mutate()}
          disabled={createCloudBackupMutation.isPending}
        >
          {t('optionsPage.backup.cloudBackupCreate', 'Create Cloud Backup')}
        </Button>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 0.75,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('optionsPage.backup.cloudRevisions', 'Revisions')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('optionsPage.backup.cloudKeepsLast', 'Keeps last 3')}
        </Typography>
      </Box>

      {isLoadingBackups ? (
        <Box sx={{ px: 2, py: 1 }}>
          <CircularProgress size={24} />
        </Box>
      ) : isBackupsError ? (
        <Box sx={{ mx: 1.5 }}>
          <Alert severity="error">
            {t(
              'optionsPage.backup.cloudListError',
              'Failed to load cloud backups.'
            )}
          </Alert>
        </Box>
      ) : !backups || backups.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', px: 2, py: 1 }}
        >
          {t(
            'optionsPage.backup.noCloudBackups',
            'No cloud backups yet. Create one to get started.'
          )}
        </Typography>
      ) : (
        <SettingsGroup>
          <CloudBackupList
            backups={backups}
            isRestoring={isRestoring}
            restoringId={downloadCloudBackupMutation.variables}
            onRestore={(id) => downloadCloudBackupMutation.mutate(id)}
          />
        </SettingsGroup>
      )}
    </>
  )
}
