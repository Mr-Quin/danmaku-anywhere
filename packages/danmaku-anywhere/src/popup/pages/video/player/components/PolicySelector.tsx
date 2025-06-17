import { NothingHere } from '@/common/components/NothingHere'
import type { KazumiPolicy } from '@/common/options/kazumiPolicy/schema'
import { useKazumiPolicies } from '@/common/options/kazumiPolicy/useKazumiManifest'
import { useStore } from '@/popup/store'
import { Box, Button, Tab, Tabs } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

export const PolicySelector = () => {
  const { t } = useTranslation()
  const { setKazumiPolicy, kazumiPolicy } = useStore.use.player()

  const navigate = useNavigate()
  const location = useLocation()

  const { data: policies } = useKazumiPolicies()

  useEffect(() => {
    if (!kazumiPolicy) {
      setKazumiPolicy(policies[0])
    }
  }, [])

  const handleSelect = (policy: KazumiPolicy) => {
    setKazumiPolicy(policy)
    if (location.pathname !== '/videoSearch') {
      navigate('/videoSearch')
    }
  }

  if (policies.length === 0) {
    return (
      <NothingHere message={t('videoSearchPage.noPolicy')}>
        <Button
          variant="contained"
          onClick={() =>
            navigate('../kazumi', { relative: 'path', state: 'import' })
          }
        >
          {t('videoSearchPage.goToImport')}
        </Button>
      </NothingHere>
    )
  }

  return (
    <Box>
      <Tabs
        value={kazumiPolicy ?? policies[0]}
        onChange={(_, newValue) => {
          if (newValue) {
            handleSelect(newValue)
          }
        }}
        variant="scrollable"
      >
        {policies.map((policy) => {
          return <Tab key={policy.name} value={policy} label={policy.name} />
        })}
      </Tabs>
    </Box>
  )
}
