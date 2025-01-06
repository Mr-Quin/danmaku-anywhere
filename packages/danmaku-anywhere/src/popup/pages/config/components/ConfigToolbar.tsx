import { AddCircle, Download, Upload } from '@mui/icons-material'
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import { mountConfigInputListSchema } from '@/common/options/mountConfig/schema'
import {
  useEditMountConfig,
  useMountConfig,
} from '@/common/options/mountConfig/useMountConfig'
import { tryCatch } from '@/common/utils/utils'
import { DrilldownMenu } from '@/popup/component/DrilldownMenu'
import { TabToolbar } from '@/popup/component/TabToolbar'

const CAN_IMPORT = typeof window.showOpenFilePicker === 'function'

export const ConfigToolbar = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation()
  const { createMultiple } = useEditMountConfig()
  const { exportConfigs } = useMountConfig()

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
      mountConfigInputListSchema.parseAsync(JSON.parse(json))
    )

    if (parseErr) {
      Logger.error('Failed to parse imported config', parseErr)
      return
    }

    await createMultiple.mutateAsync(mountConfigList)
  }

  return (
    <TabToolbar title={t('configPage.name')}>
      <IconButton
        aria-label={t('common.add')}
        onClick={() => {
          onAdd()
        }}
        color="primary"
      >
        <Tooltip title={t('common.add')}>
          <AddCircle />
        </Tooltip>
      </IconButton>
      <DrilldownMenu ButtonProps={{ edge: 'end' }}>
        <Tooltip
          title={CAN_IMPORT ? '' : 'Importing is not available in this browser'}
        >
          {/* A div is needed for the tooltip to show up for a disabled element  */}
          <div>
            <MenuItem onClick={handleImportConfigs} disabled={!CAN_IMPORT}>
              <ListItemIcon>
                <Upload />
              </ListItemIcon>
              <ListItemText>{t('common.import')}</ListItemText>
            </MenuItem>
          </div>
        </Tooltip>
        <MenuItem onClick={exportConfigs}>
          <ListItemIcon>
            <Download />
          </ListItemIcon>
          <ListItemText>{t('common.export')}</ListItemText>
        </MenuItem>
      </DrilldownMenu>
    </TabToolbar>
  )
}
