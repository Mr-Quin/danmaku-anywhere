import { AddCircle, Download, Upload } from '@mui/icons-material'
import { IconButton, Toolbar, Tooltip, Typography } from '@mui/material'

import { mountConfigListSchema } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { tryCatch } from '@/common/utils'

const CAN_IMPORT = typeof window.showOpenFilePicker === 'function'

export const ConfigToolbar = ({ onAdd }: { onAdd: () => void }) => {
  const { exportConfigs, importConfigs } = useMountConfig()

  const handleImportConfigs = async () => {
    // TODO: showOpenFilePicker is not available in Firefox
    // throws DOMException when user closes the file picker, ignore this error
    const [fileHandles, err] = await tryCatch(() =>
      showOpenFilePicker({
        types: [
          {
            description: 'JSON files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
        multiple: false,
        excludeAcceptAllOption: true,
      })
    )

    if (err) return

    const [fileHandle] = fileHandles

    const json = await (await fileHandle.getFile()).text()

    const mountConfigList = mountConfigListSchema.parse(JSON.parse(json))

    console.log(mountConfigList)
    await importConfigs(mountConfigList)
  }

  return (
    <Toolbar>
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        Configs
      </Typography>
      <IconButton
        aria-label="add"
        onClick={() => {
          onAdd()
        }}
        color="inherit"
      >
        <Tooltip title="Add">
          <AddCircle />
        </Tooltip>
      </IconButton>
      <IconButton
        aria-label="add"
        onClick={() => {
          exportConfigs()
        }}
        color="inherit"
      >
        <Tooltip title="Export">
          <Download />
        </Tooltip>
      </IconButton>
      <IconButton
        aria-label="add"
        onClick={() => {
          handleImportConfigs()
        }}
        disabled={!CAN_IMPORT}
        color="inherit"
      >
        <Tooltip title="Import">
          <Upload />
        </Tooltip>
      </IconButton>
    </Toolbar>
  )
}
