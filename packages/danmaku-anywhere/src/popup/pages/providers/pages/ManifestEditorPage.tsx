import type { ConfigSchema } from '@mr-quin/dango'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { ManifestValidationIssue } from '@/common/rpcClient/background/types'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ManifestTestRunPanel } from '../components/ManifestTestRunPanel'
import {
  useManifestSource,
  useSaveUserManifest,
} from '../hooks/useManifestEditor'
import {
  parseManifestJson,
  STARTER_MANIFEST,
  stringifyManifest,
} from '../manifestEditor'

type EditorMode = 'create' | 'edit' | 'view'

interface EditorState {
  manifestId?: string
}

interface ManifestEditorProps {
  initialText: string
  initialMode: EditorMode
}

function ManifestEditor({ initialText, initialMode }: ManifestEditorProps) {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const goBack = useGoBack()
  const save = useSaveUserManifest()

  const [text, setText] = useState(initialText)
  const [forked, setForked] = useState(false)
  const [issues, setIssues] = useState<ManifestValidationIssue[]>([])
  const [isValidating, setIsValidating] = useState(false)
  // The last parseable manifest, so the test-run panel keeps its state
  // (keyword, results, selections) while the JSON is mid-edit rather than
  // unmounting on every keystroke.
  const [lastValid, setLastValid] = useState<{
    value: unknown
    configSchema?: ConfigSchema
  } | null>(null)

  const mode = forked ? 'create' : initialMode
  const readOnly = mode === 'view'

  const parsed = useMemo(() => parseManifestJson(text), [text])

  useEffect(() => {
    if (
      parsed.ok &&
      typeof parsed.value === 'object' &&
      parsed.value !== null
    ) {
      setLastValid({
        value: parsed.value,
        configSchema: (parsed.value as { configSchema?: ConfigSchema })
          .configSchema,
      })
    }
  }, [parsed])

  useEffect(() => {
    if (!parsed.ok) {
      setIssues([])
      setIsValidating(false)
      return
    }
    setIsValidating(true)
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const res = await chromeRpcClient.providerValidateManifest({
          manifest: parsed.value,
        })
        if (!cancelled) {
          setIssues(res.data.valid ? [] : res.data.issues)
        }
      } catch {
        if (!cancelled) {
          setIssues([
            {
              path: '',
              message: t(
                'providers.editor.manifest.validateFailed',
                'Could not validate the manifest'
              ),
            },
          ])
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false)
        }
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [parsed, t])

  const isValid = parsed.ok && !isValidating && issues.length === 0

  const title = () => {
    if (mode === 'view') {
      return t('providers.editor.manifest.viewTitle', 'Manifest source')
    }
    if (mode === 'edit') {
      return t('providers.editor.manifest.editTitle', 'Edit manifest')
    }
    return t('providers.editor.manifest.createTitle', 'Author manifest')
  }

  // Forking a read-only manifest must not reuse its id, or the create-guard
  // rejects the save. Seed a distinct id so the copy saves as-is.
  const handleDuplicate = () => {
    if (
      !parsed.ok ||
      typeof parsed.value !== 'object' ||
      parsed.value === null ||
      Array.isArray(parsed.value)
    ) {
      return
    }
    const source = parsed.value as { id?: unknown }
    const baseId = typeof source.id === 'string' ? source.id : 'manifest'
    setText(stringifyManifest({ ...source, id: `${baseId}-copy` }))
    setForked(true)
  }

  const handleSave = () => {
    if (!parsed.ok) {
      return
    }
    save.mutate(
      { manifest: parsed.value, mode: mode === 'edit' ? 'update' : 'create' },
      {
        onSuccess: () => {
          toast.success(t('providers.editor.manifest.saved', 'Manifest saved'))
          goBack()
        },
        onError: (error) => toast.error(error.message),
      }
    )
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={title()} onGoBack={goBack} />
      <Box sx={{ p: 2 }}>
        <Stack direction="column" spacing={2}>
          <TextField
            label={t('providers.editor.manifest.json', 'Manifest JSON')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={12}
            fullWidth
            slotProps={{
              input: {
                readOnly,
                sx: { fontFamily: 'monospace', fontSize: 13 },
              },
            }}
          />

          {!parsed.ok ? (
            <Alert severity="error">
              <AlertTitle>
                {t('providers.editor.manifest.invalidJson', 'Invalid JSON')}
              </AlertTitle>
              {parsed.error}
            </Alert>
          ) : null}

          {parsed.ok && issues.length > 0 ? (
            <Alert severity="warning">
              <AlertTitle>
                {t(
                  'providers.editor.manifest.invalidManifest',
                  'Manifest does not match the schema'
                )}
              </AlertTitle>
              <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                {issues.map((issue, index) => (
                  <li key={`${issue.path}:${issue.message}:${index}`}>
                    {issue.path ? `${issue.path}: ` : ''}
                    {issue.message}
                  </li>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {isValid ? (
            <Typography variant="body2" color="success.main">
              {t('providers.editor.manifest.valid', 'Manifest is valid')}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1}>
            {readOnly ? (
              <Button variant="outlined" onClick={handleDuplicate}>
                {t('providers.editor.manifest.duplicate', 'Duplicate')}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!isValid || save.isPending}
                startIcon={
                  save.isPending ? <CircularProgress size={16} /> : undefined
                }
              >
                {t('common.save', 'Save')}
              </Button>
            )}
          </Stack>

          {!readOnly && lastValid ? (
            <ManifestTestRunPanel
              key={JSON.stringify(lastValid.configSchema ?? null)}
              manifest={parsed.ok ? parsed.value : lastValid.value}
              configSchema={lastValid.configSchema}
              disabled={!isValid}
            />
          ) : null}
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}

export const ManifestEditorPage = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const goBack = useGoBack()
  const { manifestId } = (location.state ?? {}) as EditorState

  const sourceQuery = useManifestSource(manifestId)

  if (!manifestId) {
    return (
      <ManifestEditor initialText={STARTER_MANIFEST} initialMode="create" />
    )
  }

  if (sourceQuery.isLoading) {
    return (
      <OptionsPageLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </OptionsPageLayout>
    )
  }

  const source = sourceQuery.data
  if (!source) {
    return (
      <OptionsPageLayout>
        <OptionsPageToolBar
          title={t('providers.editor.manifest.viewTitle', 'Manifest source')}
          onGoBack={goBack}
        />
        <Box sx={{ p: 2 }}>
          <Typography color="text.secondary">
            {t(
              'providers.editor.manifest.notFound',
              'No manifest source is available for this source.'
            )}
          </Typography>
        </Box>
      </OptionsPageLayout>
    )
  }

  const initialText = stringifyManifest(source.manifest)
  const mode: EditorMode = source.kind === 'user' ? 'edit' : 'view'
  return (
    <ManifestEditor
      key={manifestId}
      initialText={initialText}
      initialMode={mode}
    />
  )
}
