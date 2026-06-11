import type { ConfigSchema } from '@mr-quin/dango'
import { OpenInNew } from '@mui/icons-material'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { useToast } from '@/common/components/Toast/toastStore'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { ManifestValidationIssue } from '@/common/rpcClient/background/types'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { tryCatchSync } from '@/common/utils/tryCatch'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { createConfigFromManifest, manifestNeedsConfigForm } from '../catalog'
import { ManifestTestRunPanel } from '../components/ManifestTestRunPanel'
import {
  useManifestSource,
  useSaveUserManifest,
} from '../hooks/useManifestEditor'
import { STARTER_MANIFEST, stringifyManifest } from '../manifestEditor'

const MANIFEST_DOCS_PATH = 'docs/danmaku-manifest/'

type EditorMode = 'create' | 'edit' | 'view'

interface EditorState {
  manifestId?: string
}

interface ManifestEditorProps {
  initialText: string
  initialMode: EditorMode
  manifestId?: string
}

function ManifestEditor({
  initialText,
  initialMode,
  manifestId,
}: ManifestEditorProps) {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const goBack = useGoBack()
  const save = useSaveUserManifest()
  const { create } = useEditProviderConfig()

  const [text, setText] = useState(initialText)
  const [forked, setForked] = useState(false)
  const [issues, setIssues] = useState<ManifestValidationIssue[]>([])
  const [isValidating, setIsValidating] = useState(false)

  const mode = forked ? 'create' : initialMode
  const readOnly = mode === 'view'

  const [parsedValue, parseError] = useMemo(
    () => tryCatchSync(() => JSON.parse(text) as unknown),
    [text]
  )
  const parsedObject = useMemo(() => {
    if (
      parseError ||
      typeof parsedValue !== 'object' ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return null
    }
    return parsedValue as Record<string, unknown>
  }, [parsedValue, parseError])

  // The last manifest object that passed zManifest validation, so the
  // test-run panel keeps its state (keyword, results, selections) while the
  // JSON is mid-edit, and never renders a configSchema the engine has not
  // accepted (a half-edited schema could crash the schema-driven form).
  const [lastValidObject, setLastValidObject] = useState<Record<
    string,
    unknown
  > | null>(null)

  const lastValidSchema = useMemo(() => {
    const raw = lastValidObject?.configSchema
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return undefined
    }
    return raw as ConfigSchema
  }, [lastValidObject])

  useEffect(() => {
    if (parseError) {
      setIssues([])
      setIsValidating(false)
      return
    }
    setIsValidating(true)
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const res = await chromeRpcClient.providerValidateManifest({
          manifest: parsedValue,
        })
        if (!cancelled) {
          setIssues(res.data.valid ? [] : res.data.issues)
          if (res.data.valid && parsedObject) {
            setLastValidObject(parsedObject)
          }
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
  }, [parsedValue, parsedObject, parseError, t])

  const isValid = !parseError && !isValidating && issues.length === 0

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
    if (!parsedObject) {
      return
    }
    const baseId =
      typeof parsedObject.id === 'string' ? parsedObject.id : 'manifest'
    setText(stringifyManifest({ ...parsedObject, id: `${baseId}-copy` }))
    setForked(true)
  }

  // A new manifest is auto-imported (a default config instance is created), so
  // it shows up in Installed without a second step. That instance is built from
  // configSchema defaults, so reject a manifest whose required fields have no
  // default; on update the same rule keeps existing instances satisfiable.
  const handleSave = () => {
    if (!parsedObject) {
      return
    }
    const manifest = parsedObject as {
      id: string
      name?: string
      version?: string
      configSchema?: ConfigSchema
    }
    const isNew = mode !== 'edit'

    if (manifestNeedsConfigForm(manifest.configSchema)) {
      toast.error(
        t(
          'providers.editor.manifest.requiredConfig',
          'This manifest has required settings without defaults, so it cannot be saved as a default source.'
        )
      )
      return
    }

    const finish = () => {
      toast.success(t('providers.editor.manifest.saved', 'Manifest saved'))
      goBack()
    }

    save.mutate(
      {
        manifest: parsedObject,
        mode: isNew ? 'create' : 'update',
        expectedId: isNew ? undefined : manifestId,
      },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => {
          getTrackingService().track('manifestSave', {
            mode: isNew ? 'create' : 'update',
          })
          if (!isNew) {
            finish()
            return
          }
          create.mutate(
            createConfigFromManifest({
              id: manifest.id,
              name:
                typeof manifest.name === 'string' ? manifest.name : manifest.id,
              version:
                typeof manifest.version === 'string' ? manifest.version : '',
              configSchema: manifest.configSchema,
              kind: 'user',
            }),
            {
              onSuccess: finish,
              // The manifest is already registered; retrying Save would hit
              // the create-guard. Leave the editor so the user can import or
              // delete it from the source list instead.
              onError: (error) => {
                toast.error(
                  t(
                    'providers.editor.manifest.importFailed',
                    'Manifest saved, but creating its source failed: {{message}}. Import it from the source list.',
                    { message: error.message }
                  )
                )
                goBack()
              },
            }
          )
        },
      }
    )
  }

  const docsRow = (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={t('providers.editor.manifest.beta', 'Beta')}
      />
      <Button
        variant="text"
        size="small"
        component="a"
        href={docsLink(MANIFEST_DOCS_PATH)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('common.docs', 'Docs')}
        <OpenInNew fontSize="inherit" sx={{ ml: 0.5 }} />
      </Button>
    </Stack>
  )

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={title()} onGoBack={goBack} />
      <Box sx={{ p: 2 }}>
        <Stack direction="column" spacing={2}>
          {docsRow}
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

          {parseError ? (
            <Alert severity="error">
              <AlertTitle>
                {t('providers.editor.manifest.invalidJson', 'Invalid JSON')}
              </AlertTitle>
              {parseError.message}
            </Alert>
          ) : null}

          {!parseError && issues.length > 0 ? (
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
                disabled={!isValid || save.isPending || create.isPending}
                startIcon={
                  save.isPending || create.isPending ? (
                    <CircularProgress size={16} />
                  ) : undefined
                }
              >
                {t('common.save', 'Save')}
              </Button>
            )}
          </Stack>

          {!readOnly && lastValidObject ? (
            <ManifestTestRunPanel
              key={JSON.stringify(lastValidSchema ?? null)}
              manifest={lastValidObject}
              configSchema={lastValidSchema}
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
    // A failed RPC must not read as "this manifest does not exist"; the
    // source is intact in storage, the load just failed.
    const message = sourceQuery.isError
      ? t(
          'providers.editor.manifest.loadFailed',
          'Failed to load the manifest source.'
        )
      : t(
          'providers.editor.manifest.notFound',
          'No manifest source is available for this source.'
        )
    return (
      <OptionsPageLayout>
        <OptionsPageToolBar
          title={t('providers.editor.manifest.viewTitle', 'Manifest source')}
          onGoBack={goBack}
        />
        <Box sx={{ p: 2 }}>
          <Typography color="text.secondary">{message}</Typography>
        </Box>
      </OptionsPageLayout>
    )
  }

  const initialText = stringifyManifest(source.manifest)
  const mode: EditorMode = source.kind === 'user' ? 'edit' : 'view'
  return (
    <ManifestEditor
      key={manifestId}
      manifestId={manifestId}
      initialText={initialText}
      initialMode={mode}
    />
  )
}
