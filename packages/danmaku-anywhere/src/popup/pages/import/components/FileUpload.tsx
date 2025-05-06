import CloudUploadIcon from '@mui/icons-material/CloudUpload' // MUI icon
import { Box, Typography } from '@mui/material'
import { type SxProps, type Theme, styled } from '@mui/material/styles'
import type React from 'react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  sx?: SxProps<Theme>
}

interface StyledDropZoneProps {
  isDragging: boolean
}

const StyledDropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragging',
})<StyledDropZoneProps>(({ theme, isDragging }) => ({
  border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.grey[400]}`,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  backgroundColor: isDragging
    ? theme.palette.action.hover
    : theme.palette.background.paper,
  transition: theme.transitions.create(['border-color', 'background-color']),
  '&:hover': {
    borderColor: theme.palette.primary.light,
    backgroundColor: theme.palette.action.selected,
  },
}))

const HiddenInput = styled('input')({
  display: 'none',
})

export const FileUpload = ({
  onFilesSelected,
  accept,
  multiple = true,
  sx,
}: FileUploadProps) => {
  const { t } = useTranslation()

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(Array.from(event.target.files))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const relatedTarget = event.relatedTarget as Node
    if (!event.currentTarget.contains(relatedTarget)) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  return (
    <StyledDropZone
      isDragging={isDragging}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
      sx={sx}
    >
      <HiddenInput
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
      <CloudUploadIcon
        sx={{
          fontSize: 60,
          marginBottom: 2,
          color: 'primary.main',
        }}
      />
      <Typography
        variant="h6"
        color={isDragging ? 'primary.main' : 'textSecondary'}
      >
        {t('importPage.help.dragNDrop1')}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {t('importPage.help.dragNDrop2')}
      </Typography>
    </StyledDropZone>
  )
}
