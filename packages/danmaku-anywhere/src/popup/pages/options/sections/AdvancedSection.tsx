import { List } from '@mui/material'

import { DebugOption } from '@/popup/pages/options/pages/advanced/components/DebugOption'
import { SimplifiedSearchListItem } from '@/popup/pages/options/pages/advanced/components/SimplifiedSearchListItem'

export const AdvancedSection = () => {
  return (
    <List disablePadding>
      <SimplifiedSearchListItem />
      <DebugOption />
    </List>
  )
}
