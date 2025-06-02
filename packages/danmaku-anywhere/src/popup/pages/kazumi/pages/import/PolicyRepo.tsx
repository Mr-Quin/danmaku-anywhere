import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { NothingHere } from '@/common/components/NothingHere'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  KAZUMI_RULES_BASE_URL,
  zKazumiPolicy,
} from '@/common/options/kazumiPolicy/schema'
import { kazumiPolicyService } from '@/common/options/kazumiPolicy/service'
import {
  useKazumiManifest,
  useKazumiPolicies,
} from '@/common/options/kazumiPolicy/useKazumiManifest'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { CheckCircle, Download } from '@mui/icons-material'
import { Icon, IconButton, List, ListItem, ListItemText } from '@mui/material'
import {} from '@mui/x-data-grid'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export const PolicyRepo = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const { data: manifestList, isLoading, isError, error } = useKazumiManifest()
  const { data: policies } = useKazumiPolicies()

  const exists = (name: string) => {
    return policies.some((policy) => policy.name === name)
  }

  const importMutation = useMutation({
    mutationKey: kazumiQueryKeys.policies(),
    mutationFn: async (name: string) => {
      if (exists(name)) {
        return
      }

      const res = await fetch(`${KAZUMI_RULES_BASE_URL}/${name}.json`)
      const policy = zKazumiPolicy.parse(await res.json())
      return kazumiPolicyService.import(policy)
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (isError) {
    return <ErrorMessage message={error.message} />
  }

  if (!manifestList || manifestList.length === 0) {
    return <NothingHere />
  }

  return (
    <>
      <List>
        {manifestList.map((manifest) => {
          return (
            <ListItem
              key={manifest.name}
              secondaryAction={
                exists(manifest.name) ? (
                  <Icon color="success">
                    <CheckCircle />
                  </Icon>
                ) : (
                  <IconButton
                    onClick={() => importMutation.mutate(manifest.name)}
                    disabled={
                      importMutation.isPending &&
                      importMutation.variables === manifest.name
                    }
                    edge="end"
                  >
                    <Download />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={manifest.name}
                secondary={manifest.version}
              />
            </ListItem>
          )
        })}
      </List>
    </>
  )
}
