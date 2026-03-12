import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useToast } from '@/common/components/Toast/toastStore'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { SectionHeader } from './SectionHeader'

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
  } = useQuery({
    queryKey: ['cloudBackups'],
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
      toast.error(`Cloud backup failed: ${error.message}`)
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
      toast.error(`Failed to download cloud backup: ${error.message}`)
      onRestoringChange?.(false)
    },
  })

  const isRestoring =
    importMutation.isPending || downloadCloudBackupMutation.isPending

  return (
    <>
      <SectionHeader
        title={t('optionsPage.backup.cloudBackup', 'Cloud Backup')}
        description={t(
          'optionsPage.backup.cloudDescription',
          'Sync your settings to the cloud. Up to 3 revisions are kept.'
        )}
      />

      {!isSignedIn ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t(
              'optionsPage.backup.cloudSignInRequired',
              'Sign in to use cloud backup.'
            )}{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/options/auth')}
              sx={{ verticalAlign: 'baseline' }}
            >
              {t('optionsPage.backup.goToSignIn', 'Go to Sign In')}
            </Link>
          </Typography>
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => createCloudBackupMutation.mutate()}
              disabled={createCloudBackupMutation.isPending}
            >
              {createCloudBackupMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('optionsPage.backup.cloudBackupCreate', 'Create Cloud Backup')
              )}
            </Button>
          </Box>

          {isLoadingBackups ? (
            <Box sx={{ py: 2, display: 'flex', justifyContent: 'flex-start' }}>
              <CircularProgress size={24} />
            </Box>
          ) : !backups || backups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {t(
                'optionsPage.backup.noCloudBackups',
                'No cloud backups yet. Create one to get started.'
              )}
            </Typography>
          ) : (
            <List disablePadding>
              {backups.map((backup, index) => (
                <ListItem
                  key={backup.id}
                  disablePadding
                  sx={{ mb: 1.5 }}
                  secondaryAction={
                    <Button
                      size="small"
                      disabled={isRestoring}
                      onClick={() =>
                        downloadCloudBackupMutation.mutate(backup.id)
                      }
                    >
                      {downloadCloudBackupMutation.isPending &&
                      downloadCloudBackupMutation.variables === backup.id ? (
                        <CircularProgress size={18} />
                      ) : (
                        t('common.restore', 'Restore')
                      )}
                    </Button>
                  }
                >
                  <ListItemText
                    primary={new Date(backup.createdAt).toLocaleString()}
                    secondary={
                      index === 0
                        ? t('optionsPage.backup.latestRevision', 'Latest')
                        : undefined
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
    </>
  )
}
