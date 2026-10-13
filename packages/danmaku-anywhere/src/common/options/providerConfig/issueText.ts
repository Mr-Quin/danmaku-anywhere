import type { ConfigIssue, ConfigSchema } from '@mr-quin/dango'
import { i18n } from '@/common/localization/i18n'
import { getProviderConfigError } from './ProviderConfigError'

function schemaAt(
  root: ConfigSchema | undefined,
  path: ConfigIssue['path']
): ConfigSchema | undefined {
  let node = root
  for (const key of path) {
    node = typeof key === 'number' ? node?.items : node?.properties?.[key]
  }
  return node
}

function fieldTitle(schema: ConfigSchema | undefined, key: string): string {
  const title = schema?.properties?.[key]?.title
  return typeof title === 'string' && title.length > 0 ? title : key
}

function numberParam(issue: ConfigIssue, key: string): number | undefined {
  const value = issue.params?.[key]
  return typeof value === 'number' ? value : undefined
}

function alternativesText(issue: ConfigIssue, root: ConfigSchema | undefined) {
  const node = schemaAt(root, issue.path)
  const alternatives = issue.params?.alternatives
  if (!Array.isArray(alternatives)) {
    return ''
  }
  const language = i18n.language
  const and = new Intl.ListFormat(language, { type: 'conjunction' })
  const or = new Intl.ListFormat(language, { type: 'disjunction' })
  return or.format(
    alternatives.map((keys: string[]) =>
      and.format(keys.map((key) => fieldTitle(node, key)))
    )
  )
}

// `root` is the schema the issue's path starts from.
export function configIssueMessage(
  issue: ConfigIssue,
  root: ConfigSchema | undefined
): string {
  switch (issue.code) {
    case 'required':
      return i18n.t(
        'providers.editor.validation.required',
        'This field is required'
      )
    case 'requiredAlternatives':
      return i18n.t(
        'providers.editor.validation.requiredAlternatives',
        'Fill in {{fields}}',
        { fields: alternativesText(issue, root) }
      )
    case 'minLength':
      return i18n.t(
        'providers.editor.validation.minLength',
        'Must be at least {{min}} characters',
        { min: numberParam(issue, 'min') }
      )
    case 'maxLength':
      return i18n.t(
        'providers.editor.validation.maxLength',
        'Must be at most {{max}} characters',
        { max: numberParam(issue, 'max') }
      )
    case 'pattern':
      return i18n.t(
        'providers.editor.validation.pattern',
        'Must match the pattern {{pattern}}',
        { pattern: issue.params?.pattern }
      )
    case 'format':
      return i18n.t('providers.editor.validation.url', 'Not a valid URL')
    case 'minimum':
      return i18n.t(
        'providers.editor.validation.minimum',
        'Must be at least {{min}}',
        { min: numberParam(issue, 'min') }
      )
    case 'maximum':
      return i18n.t(
        'providers.editor.validation.maximum',
        'Must be at most {{max}}',
        { max: numberParam(issue, 'max') }
      )
    case 'type':
      if (issue.params?.expected === 'integer') {
        return i18n.t(
          'providers.editor.validation.integer',
          'Must be a whole number'
        )
      }
      return i18n.t('providers.editor.validation.invalid', 'Not a valid value')
    case 'enum':
      return i18n.t(
        'providers.editor.validation.enum',
        'Pick one of the options'
      )
    default:
      return i18n.t('providers.editor.validation.invalid', 'Not a valid value')
  }
}

export function describeProviderConfigError(
  error: unknown
): string | undefined {
  const detail = getProviderConfigError(error)
  if (!detail) {
    return undefined
  }
  switch (detail.code) {
    case 'config.invalid': {
      const [issue] = detail.params.issues
      const path = issue?.path.join('.') ?? ''
      const message = issue
        ? configIssueMessage(issue, undefined)
        : i18n.t('providers.editor.validation.invalid', 'Not a valid value')
      return path === '' ? message : `${path}: ${message}`
    }
    case 'config.nameRequired':
      return i18n.t('providers.error.nameRequired', 'Give the source a name')
    case 'config.notFound':
      return i18n.t(
        'providers.error.notFound',
        'This source no longer exists. It may have been deleted.'
      )
    case 'config.duplicate':
      return i18n.t(
        'providers.error.duplicate',
        'This built-in source is already installed'
      )
    case 'config.notBuiltin':
      return i18n.t(
        'providers.error.notBuiltin',
        'This source has no built-in instance'
      )
    case 'config.orderMismatch':
      return i18n.t(
        'providers.error.orderMismatch',
        'The source list changed. Try reordering again.'
      )
  }
}
