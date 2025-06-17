import type { KazumiPolicy } from '@/common/options/kazumiPolicy/schema'
import { useKazumiPolicies } from '@/common/options/kazumiPolicy/useKazumiManifest'
import { useStore } from '@/popup/store'
import { Box, Tab, Tabs } from '@mui/material'
import { useEffect } from 'react'

export const PolicySelector = () => {
  const { setKazumiPolicy, kazumiPolicy } = useStore.use.player()

  const { data: policies } = useKazumiPolicies()

  useEffect(() => {
    if (!kazumiPolicy) {
      setKazumiPolicy(policies[0])
    }
  }, [])

  const handleSelect = (policy: KazumiPolicy) => {
    setKazumiPolicy(policy)
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
