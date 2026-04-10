import { Check, Close } from '@mui/icons-material'
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { type RefObject, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'
import { useToast } from '@/common/components/Toast/toastStore'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
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

function NamingRuleDialogContent({
  folderPath,
  existingRule,
  titleRef,
  templateRef,
  errorsRef,
}: {
  folderPath: string
  existingRule?: NamingRule
  titleRef: RefObject<string>
  templateRef: RefObject<string>
  errorsRef: RefObject<{ title?: string; pattern?: string }>
}) {
  const { t } = useTranslation()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { rules } = useNamingRules()

  const { filesInFolder, autoDetected } = useMemo(() => {
    const files = customEpisodes
      .filter((ep) => {
        const parts = ep.title.split('/').filter(Boolean)
        parts.pop()
        return parts.join('/') === folderPath
      })
      .map((ep) => {
        const parts = ep.title.split('/').filter(Boolean)
        return {
          fileName: parts[parts.length - 1],
          fullPath: ep.title,
        }
      })
      .sort((a, b) => a.fileName.localeCompare(b.fileName))

    return {
      filesInFolder: files,
      autoDetected: detectPattern(files.map((f) => f.fileName)),
    }
  }, [customEpisodes, folderPath])

  const defaultTitle =
    existingRule?.title ??
    (folderPath.split('/').pop() || t('namingRule.rootFolder', '(root)'))

  const [title, setTitle] = useState(defaultTitle)
  const [template, setTemplate] = useState(
    existingRule?.pattern ?? autoDetected ?? ''
  )
  const [errors, setErrors] = useState<{ title?: string; pattern?: string }>({})

  // Keep refs in sync for the dialog's onConfirm
  titleRef.current = title
  templateRef.current = template
  errorsRef.current = errors

  const patternRegex = template ? buildPatternRegex(template) : null

  const fileMatches = filesInFolder.map((file) => {
    const episodeNumber = patternRegex
      ? extractEpisodeFromRegex(patternRegex, file.fileName)
      : null
    return { ...file, episodeNumber }
  })

  const matchCount = fileMatches.filter((f) => f.episodeNumber !== null).length

  const validateFields = (titleVal: string, templateVal: string) => {
    const newErrors: { title?: string; pattern?: string } = {}

    // Check duplicate title
    const duplicate = rules.find(
      (r) => r.title === titleVal && r.folderPath !== folderPath
    )
    if (duplicate) {
      newErrors.title = t(
        'namingRule.duplicateTitle',
        'A naming rule with this title already exists'
      )
    }

    // Validate pattern
    const result = namingRuleSchema.safeParse({
      folderPath,
      title: titleVal,
      pattern: templateVal,
    })
    if (!result.success) {
      const patternError = result.error.issues.find(
        (i) => i.path[0] === 'pattern'
      )
      if (patternError) {
        newErrors.pattern = patternError.message
      }
    }

    setErrors(newErrors)
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    validateFields(value, template)
  }

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    validateFields(title, value)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('namingRule.filesInFolder', 'Files in folder')} (
            {template
              ? t('namingRule.matchCount', '{{matched}} / {{total}} matched', {
                  matched: matchCount,
                  total: filesInFolder.length,
                })
              : filesInFolder.length}
            )
          </Typography>
          <List
            dense
            disablePadding
            sx={(theme) => ({
              maxHeight: 200,
              overflow: 'auto',
              ...getScrollBarProps(theme),
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
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'baseline',
                          }}
                        >
                          <span>{file.fileName}</span>
                          <Typography
                            component="span"
                            color="success.main"
                            sx={{ fontSize: '0.7rem', lineHeight: 'inherit' }}
                          >
                            {t('namingRule.episodeLabel', 'Ep {{number}}', {
                              number: file.episodeNumber,
                            })}
                          </Typography>
                        </Box>
                      ) : (
                        file.fileName
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
  )
}

export const useCreateMatchingRuleDialog = () => {
  const { t } = useTranslation()
  const dialog = useDialog()
  const toast = useToast.use.toast()
  const { addRule, removeRule } = useEditNamingRules()

  const titleRef = useRef('')
  const templateRef = useRef('')
  const errorsRef = useRef<{ title?: string; pattern?: string }>({})

  return (folderPath: string, existingRule?: NamingRule) => {
    const isEditing = existingRule !== undefined

    // Reset refs to avoid stale data from previous dialog
    titleRef.current = ''
    templateRef.current = ''
    errorsRef.current = {}

    const dialogId = dialog.confirm({
      title: isEditing
        ? t('namingRule.edit', 'Edit Naming Rule')
        : t('namingRule.create', 'Create Naming Rule'),
      content: (
        <NamingRuleDialogContent
          folderPath={folderPath}
          existingRule={existingRule}
          titleRef={titleRef}
          templateRef={templateRef}
          errorsRef={errorsRef}
        />
      ),
      onConfirm: async () => {
        if (errorsRef.current.title || errorsRef.current.pattern) {
          const msg =
            errorsRef.current.title ||
            errorsRef.current.pattern ||
            'Validation failed'
          toast.error(msg)
          throw new Error(msg)
        }

        const result = namingRuleSchema.safeParse({
          folderPath,
          title: titleRef.current,
          pattern: templateRef.current,
        })
        if (!result.success) {
          const msg = result.error.issues[0]?.message ?? 'Invalid rule'
          toast.error(msg)
          throw new Error(msg)
        }

        try {
          await addRule.mutateAsync(result.data)
          toast.success(t('namingRule.ruleCreated', 'Naming rule saved'))
        } catch (error) {
          const msg =
            error instanceof Error
              ? error.message
              : t('namingRule.ruleCreateFailed', 'Failed to save naming rule')
          toast.error(msg)
          throw error instanceof Error ? error : new Error(msg)
        }
      },
      extraAction: isEditing ? (
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            dialog.delete({
              title: t('common.delete', 'Delete'),
              content: t(
                'namingRule.deleteConfirm',
                'Are you sure you want to delete this naming rule?'
              ),
              onConfirm: async () => {
                await removeRule.mutateAsync(folderPath)
                toast.success(
                  t('namingRule.ruleDeleted', 'Naming rule deleted')
                )
                dialog.close(dialogId)
              },
              dialogProps: {
                sx: { zIndex: 1403 },
              },
            })
          }}
        >
          {t('common.delete', 'Delete')}
        </Button>
      ) : undefined,
      dialogProps: {
        maxWidth: 'sm',
        fullWidth: true,
        sx: { zIndex: 1402 },
      },
    })
  }
}
