import { InfoOutline } from '@mui/icons-material'
import { styled, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { docsLink } from '../utils/utils'

const StyledAnchor = styled('a')({
  color: 'inherit',
  textDecoration: 'none',
  lineHeight: 0,
})

interface DocIconProps {
  path: string
  label?: string
}

export const DocIcon = ({ path, label }: DocIconProps) => {
  const { t } = useTranslation()
  const link = docsLink(path)

  return (
    <Tooltip title={label || t('common.viewDocs', 'View Docs')}>
      <StyledAnchor
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
      >
        <InfoOutline fontSize="small" />
      </StyledAnchor>
    </Tooltip>
  )
}
