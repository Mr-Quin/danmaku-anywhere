import { Check, Close } from '@mui/icons-material'
import {
  Box,
  Button,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'
import { useToast } from '@/common/components/Toast/toastStore'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { splitCustomEpisodePath } from '@/common/danmaku/utils'
import {
  buildPatternRegex,
  detectPattern,
  extractEpisodeFromRegex,
} from '@/common/options/localMatchingRule/patternUtils'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { namingRuleSchema } from '@/common/options/localMatchingRule/schema'
import {
  useEditNamingRules,
  useNamingRules,
} from '@/common/options/localMatchingRule/useLocalMatchingRule'

interface NamingRuleDialogContentProps {
  folderPath: string
  existingRule?: NamingRule
  onClose: () => void
}

export const NamingRuleDialogContent = ({
  folderPath,
  existingRule,
  onClose,
}: NamingRuleDialogContentProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { rules } = useNamingRules()
  const { addRule, removeRule } = useEditNamingRules()

  const isEditing = existingRule !== undefined

  const { filesInFolder, autoDetected } = useMemo(() => {
    const files: { fileName: string; fullPath: string }[] = []
    for (const ep of customEpisodes) {
      const { folderPath: epFolderPath, fileName } = splitCustomEpisodePath(
        ep.title
      )
      if (epFolderPath === folderPath) {
        files.push({ fileName, fullPath: ep.title })
      }
    }
    files.sort((a, b) => a.fileName.localeCompare(b.fileName))

    return {
      filesInFolder: files,
      autoDetected: detectPattern(files.map((f) => f.fileName)),
    }
  }, [customEpisodes, folderPath])

  const defaultTitle =
    existingRule?.title ??
    (folderPath.split('/').filter(Boolean).pop() ||
      t('namingRule.rootFolder', '(root)'))

  const [title, setTitle] = useState(defaultTitle)
  const [template, setTemplate] = useState(
    existingRule?.pattern ?? autoDetected ?? ''
  )
  const [errors, setErrors] = useState<{ title?: string; pattern?: string }>({})
  const [saving, setSaving] = useState(false)

  const { fileMatches, matchCount } = useMemo(() => {
    const regex = template ? buildPatternRegex(template) : null
    const matches = filesInFolder.map((file) => {
      const episodeNumber = regex
        ? extractEpisodeFromRegex(regex, file.fileName)
        : null
      return { ...file, episodeNumber }
    })
    return {
      fileMatches: matches,
      matchCount: matches.filter((f) => f.episodeNumber !== null).length,
    }
  }, [filesInFolder, template])

  const validateFields = (titleVal: string, templateVal: string) => {
    const newErrors: { title?: string; pattern?: string } = {}

    const duplicate = rules.find(
      (r) => r.title === titleVal && r.folderPath !== folderPath
    )
    if (duplicate) {
      newErrors.title = t(
        'namingRule.duplicateTitle',
        'A naming rule with this title already exists'
      )
    }

    const result = namingRuleSchema.safeParse({
      folderPath,
      title: titleVal,
      pattern: templateVal,
    })
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field === 'title' && !newErrors.title) {
          newErrors.title = issue.message
        } else if (field === 'pattern' && !newErrors.pattern) {
          newErrors.pattern = issue.message
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    validateFields(value, template)
  }

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    validateFields(title, value)
  }

  const handleSave = async () => {
    if (!validateFields(title, template)) {
      return
    }

    setSaving(true)
    try {
      await addRule.mutateAsync({ folderPath, title, pattern: template })
      toast.success(t('namingRule.ruleCreated', 'Naming rule saved'))
      onClose()
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : t('namingRule.ruleCreateFailed', 'Failed to save naming rule')
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    dialog.delete({
      title: t('common.delete', 'Delete'),
      content: t(
        'namingRule.deleteConfirm',
        'Are you sure you want to delete this naming rule?'
      ),
      onConfirm: async () => {
        await removeRule.mutateAsync(folderPath)
        toast.success(t('namingRule.ruleDeleted', 'Naming rule deleted'))
        onClose()
      },
      dialogProps: {
        sx: { zIndex: 1403 },
      },
    })
  }

  const hasErrors = !!errors.title || !!errors.pattern

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
        <TextField
          label={t('namingRule.folder', 'Folder')}
          value={folderPath || t('namingRule.rootFolder', '(root)')}
          size="small"
          fullWidth
          disabled
        />
        <TextField
          label={t('namingRule.title', 'Title')}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          error={!!errors.title}
          helperText={errors.title}
          size="small"
          fullWidth
        />
        <TextField
          label={t('namingRule.template', 'Filename Template')}
          value={template}
          onChange={(e) => handleTemplateChange(e.target.value)}
          error={!!errors.pattern}
          helperText={
            errors.pattern ||
            t(
              'namingRule.templateHelp',
              'Use {episode} for episode number, {episode:02d} for zero-padded'
            )
          }
          placeholder="{episode}.xml"
          size="small"
          fullWidth
          slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
        />
        {filesInFolder.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('namingRule.filesInFolder', 'Files in folder')} (
              {template
                ? t(
                    'namingRule.matchCount',
                    '{{matched}} / {{total}} matched',
                    {
                      matched: matchCount,
                      total: filesInFolder.length,
                    }
                  )
                : filesInFolder.length}
              )
            </Typography>
            <List
              dense
              disablePadding
              sx={(theme) => ({
                overflow: 'auto',
                ...getScrollBarProps(theme),
                maxHeight: '150px',
              })}
            >
              {fileMatches.map((file) => {
                const isMatch = file.episodeNumber !== null
                return (
                  <ListItem
                    key={file.fullPath}
                    disablePadding
                    sx={{ pl: 1, py: 0 }}
                  >
                    {template && (
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        {isMatch ? (
                          <Check sx={{ fontSize: 14 }} color="success" />
                        ) : (
                          <Close sx={{ fontSize: 14 }} color="disabled" />
                        )}
                      </ListItemIcon>
                    )}
                    <ListItemText
                      primary={
                        isMatch ? (
                          <Box
                            component="span"
                            title={file.fileName}
                            sx={{
                              display: 'flex',
                              gap: 1,
                              alignItems: 'baseline',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.fileName}
                            </Box>
                            <Typography
                              component="span"
                              color="success.main"
                              sx={{
                                fontSize: '0.7rem',
                                lineHeight: 'inherit',
                                flexShrink: 0,
                              }}
                            >
                              {t('namingRule.episodeLabel', 'Ep {{number}}', {
                                number: file.episodeNumber,
                              })}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            component="span"
                            title={file.fileName}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {file.fileName}
                          </Box>
                        )
                      }
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                      }}
                      sx={{ my: 0 }}
                    />
                  </ListItem>
                )
              })}
            </List>
          </Box>
        )}
      </Box>
      <DialogActions sx={{ mx: -2, mb: -2 }}>
        {isEditing && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
            sx={{ mr: 'auto' }}
          >
            {t('common.delete', 'Delete')}
          </Button>
        )}
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={hasErrors || saving}
          loading={saving}
        >
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </>
  )
}
