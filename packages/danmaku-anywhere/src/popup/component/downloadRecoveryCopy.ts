import {
  type OptionsRecoveryCopy,
  recoveryFileName,
} from '@/common/options/upgrade/recoveryCopy'
import { createDownload } from '@/common/utils/utils'

export function downloadRecoveryCopy(copy: OptionsRecoveryCopy) {
  const file = new Blob([JSON.stringify(copy, null, 2)], {
    type: 'application/json',
  })
  return createDownload(file, recoveryFileName(copy))
}
