import { Upload } from '@mui/icons-material'
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export const UploadDanmaku = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <MenuItem onClick={() => navigate('upload')}>
      <ListItemIcon>
        <Upload />
      </ListItemIcon>
      <ListItemText>{t('danmakuPage.upload.upload')}</ListItemText>
    </MenuItem>
  )
}
