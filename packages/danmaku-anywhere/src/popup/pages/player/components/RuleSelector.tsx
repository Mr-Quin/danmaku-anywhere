import { PreFormat } from '@/popup/component/PreFormat'
import {
  type KazumiPolicyManifest,
  useKazumiManifest,
  useKazumiPolicy,
} from '@/popup/pages/player/useKazumiManifest'
import { useStore } from '@/popup/store'
import { Autocomplete, Box, Tab, Tabs, TextField } from '@mui/material'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export const RuleSelector = () => {
  const { setKazumiPolicy, kazumiManifest, setKazumiManifest } =
    useStore.use.player()

  const navigate = useNavigate()

  const kazumiManifestQuery = useKazumiManifest()

  const kazumiPolicy = useKazumiPolicy(kazumiManifest?.name)

  useEffect(() => {
    // redirect to the first manifest when the page is initially loaded
    if (!kazumiManifest) {
      if (kazumiManifestQuery.data.length > 0) {
        setKazumiManifest(kazumiManifestQuery.data[0])
      }
    }
  }, [kazumiManifestQuery.data])

  useEffect(() => {
    if (kazumiPolicy.data) {
      setKazumiPolicy(kazumiPolicy.data)
    }
  }, [kazumiPolicy.data])

  const handleSelect = (manifest: KazumiPolicyManifest) => {
    setKazumiManifest(manifest)
    navigate('/player')
  }

  if (kazumiManifestQuery.data.length === 0)
    return (
      <Box>
        <PreFormat>
          No Kazumi manifests found. Please install the Kazumi extension.
        </PreFormat>
      </Box>
    )

  return (
    <Box>
      <Tabs
        value={kazumiManifest ?? kazumiManifestQuery.data[0]}
        onChange={(_, newValue) => {
          if (newValue) {
            handleSelect(newValue)
          }
        }}
        variant="scrollable"
      >
        {kazumiManifestQuery.data.map((manifest) => {
          return (
            <Tab key={manifest.name} value={manifest} label={manifest.name} />
          )
        })}
      </Tabs>

      <Autocomplete
        options={kazumiManifestQuery.data}
        getOptionLabel={(option) => option.name}
        loading={kazumiManifestQuery.isLoading}
        onChange={(_, newValue) => {
          if (newValue) {
            handleSelect(newValue)
          }
        }}
        value={kazumiManifest ?? null}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Kazumi Rules"
            variant="outlined"
            fullWidth
            size="small"
          />
        )}
      />
    </Box>
  )
}
