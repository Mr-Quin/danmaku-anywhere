import { PreFormat } from '@/popup/component/PreFormat'
import {
  type KazumiPolicy,
  type KazumiPolicyManifest,
  useKazumiPolicies,
  useKazumiPolicy,
} from '@/popup/pages/player/useKazumiPolicies'
import { Autocomplete, Box, Button, TextField, Typography } from '@mui/material'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (keyword: string, policy: KazumiPolicy) => void
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [policyManifest, setPolicyManifest] = useState<KazumiPolicyManifest>()
  const [searchKeyword, setSearchKeyword] = useState('')

  const kazumiPolicies = useKazumiPolicies()

  const kazumiPolicy = useKazumiPolicy(policyManifest?.name)

  const handleSearch = () => {
    if (kazumiPolicy.data) {
      onSearch(searchKeyword, kazumiPolicy.data)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Autocomplete
        options={kazumiPolicies.data ?? []}
        getOptionLabel={(option) => option.name}
        loading={kazumiPolicies.isLoading}
        onChange={(_, newValue) => {
          if (newValue) {
            setPolicyManifest(newValue)
          } else {
            setPolicyManifest(undefined)
          }
        }}
        value={policyManifest}
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

      {kazumiPolicy.data && (
        <PreFormat>{JSON.stringify(kazumiPolicy.data, null, 2)}</PreFormat>
      )}

      <Typography variant="subtitle1" gutterBottom>
        Video Search
      </Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          label="Search Keyword"
          variant="outlined"
          fullWidth
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!searchKeyword || !kazumiPolicy.data}
        >
          Search
        </Button>
      </Box>
    </Box>
  )
}
