import { Autocomplete, Stack, TextField, Typography } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import { fontQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

type FontSelectorProps = {
  onChange: (value: string) => void
  value: string
  label: string
  tooltip?: string
}

export const FontSelector = ({
  onChange,
  value,
  label,
  tooltip,
}: FontSelectorProps) => {
  const { data } = useSuspenseQuery({
    queryKey: fontQueryKeys.listAll(),
    queryFn: () => chromeRpcClient.getFontList(),
    select: (data) =>
      data.data
        .map((font) => {
          return font.fontId
        })
        .concat(['sans-serif', 'serif', 'monospace']), // add generic font families
  })

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
    >
      <div>
        <Typography>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {tooltip}
        </Typography>
      </div>
      <Autocomplete
        options={data}
        renderOption={(props, font) => (
          <li {...props} key={font} style={{ fontFamily: font }}>
            {font}
          </li>
        )}
        slotProps={{
          popper: {
            sx: {
              zIndex: 1403,
            },
          },
        }}
        sx={{ flexGrow: 1 }}
        size="small"
        disableClearable
        onChange={(_, value) => onChange(value || '')}
        value={value}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            fullWidth
            {...withStopPropagation()}
          />
        )}
      />
    </Stack>
  )
}
