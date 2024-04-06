import { AddCircle, Download, Upload } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'

import { mountConfigListSchema } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { Logger } from '@/common/services/Logger'
import { tryCatch } from '@/common/utils'
import { TabToolbar } from '@/popup/component/TabToolbar'

const CAN_IMPORT = typeof window.showOpenFilePicker === 'function'

export const ConfigToolbar = ({ onAdd }: { onAdd: () => void }) => {
  const { exportConfigs, importConfigs } = useMountConfig()

  const handleImportConfigs = async () => {
    // TODO: showOpenFilePicker is not available in Firefox
    // throws DOMException when user closes the file picker, ignore this error
    const [fileHandles, fileErr] = await tryCatch(() =>
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

    if (fileErr) return

    const [fileHandle] = fileHandles

    const json = await (await fileHandle.getFile()).text()

    const [mountConfigList, parseErr] = await tryCatch(() =>
      mountConfigListSchema.parseAsync(JSON.parse(json))
    )

    if (parseErr) {
      Logger.error('Failed to parse imported config', parseErr)
      return
    }

    await importConfigs(mountConfigList)
  }

  return (
    <TabToolbar title="Configs">
      <IconButton
        aria-label="add"
        onClick={() => {
          onAdd()
        }}
        color="primary"
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
        color="primary"
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
        color="primary"
      >
        <Tooltip title="Import">
          <Upload />
        </Tooltip>
      </IconButton>
    </TabToolbar>
  )
}
