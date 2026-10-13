import { Logger } from '@/common/Logger'
import { i18n } from '@/common/localization/i18n'
import { builtinDisplayName } from '@/common/options/providerConfig/builtinNames'
import {
  AppError,
  type AppErrorCode,
  type AppErrorParams,
  type SourceRef,
} from './AppError'

export interface ErrorAction {
  kind: 'openSearch'
  label: string
}

export interface ErrorDescription {
  message: string
  action?: ErrorAction
}

type MessageTable = {
  [C in AppErrorCode]: (params: AppErrorParams[C]) => string
}

function sourceName(source: SourceRef): string {
  return builtinDisplayName(
    {
      id: source.providerConfigId,
      manifestId: source.manifestId,
      name: source.name,
    },
    i18n.language
  )
}

function describeHttp(status: number, source?: SourceRef): string {
  if (status === 401 || status === 403) {
    if (source === undefined) {
      return i18n.t(
        'appError.httpAuth',
        'The server refused the request (HTTP {{status}}). You may need to sign in.',
        { status }
      )
    }
    return i18n.t(
      'appError.httpAuthSource',
      '{{source}} refused the request (HTTP {{status}}). You may need to sign in.',
      { source: sourceName(source), status }
    )
  }
  if (status === 429) {
    if (source === undefined) {
      return i18n.t(
        'appError.httpRateLimited',
        'Too many requests right now. Wait a moment and try again.'
      )
    }
    return i18n.t(
      'appError.httpRateLimitedSource',
      '{{source}} is limiting requests right now. Wait a moment and try again.',
      { source: sourceName(source) }
    )
  }
  if (source === undefined) {
    return i18n.t(
      'appError.http',
      'The server returned an error (HTTP {{status}}). Try again later.',
      { status }
    )
  }
  return i18n.t(
    'appError.httpSource',
    '{{source}} returned an error (HTTP {{status}}). Try again later.',
    { source: sourceName(source), status }
  )
}

const MESSAGES: MessageTable = {
  network: ({ source }) => {
    if (source === undefined) {
      return i18n.t(
        'appError.network',
        "Couldn't connect. Check your connection and try again."
      )
    }
    return i18n.t(
      'appError.networkSource',
      "Couldn't reach {{source}}. Check your connection and try again.",
      { source: sourceName(source) }
    )
  },
  http: ({ status, source }) => {
    return describeHttp(status, source)
  },
  timeout: ({ source }) => {
    if (source === undefined) {
      return i18n.t('appError.timeout', 'The request took too long.')
    }
    return i18n.t(
      'appError.timeoutSource',
      '{{source}} took too long to respond.',
      { source: sourceName(source) }
    )
  },
  aborted: () => {
    return i18n.t('appError.aborted', 'The request was cancelled.')
  },
  hostNotAllowed: ({ source }) => {
    if (source === undefined) {
      return i18n.t(
        'appError.hostNotAllowed',
        'The source tried to reach a site it is not allowed to use.'
      )
    }
    return i18n.t(
      'appError.hostNotAllowedSource',
      '{{source}} tried to reach a site it is not allowed to use.',
      { source: sourceName(source) }
    )
  },
  'rpc.unreachable': () => {
    return i18n.t(
      'appError.rpcUnreachable',
      'Lost connection to the extension. Reload the page and try again.'
    )
  },
  'source.removed': () => {
    return i18n.t('appError.sourceRemoved', 'This source has been deleted.')
  },
  'source.noUrlParser': () => {
    return i18n.t('appError.noUrlParser', 'No source can read this link.')
  },
  'source.urlEpisodeNotFound': () => {
    return i18n.t(
      'appError.urlEpisodeNotFound',
      'The link was recognized, but its episode could not be found.'
    )
  },
  'source.episodesUnsupported': ({ source }) => {
    return i18n.t(
      'appError.episodesUnsupported',
      '{{source}} cannot list episodes.',
      { source: sourceName(source) }
    )
  },
  'source.refetchUnsupported': ({ source }) => {
    return i18n.t(
      'appError.refetchUnsupported',
      '{{source}} cannot fetch danmaku for saved episodes again.',
      { source: sourceName(source) }
    )
  },
  'source.noDanmaku': ({ title }) => {
    return i18n.t('appError.noDanmaku', 'No danmaku found for {{title}}.', {
      title,
    })
  },
  'match.notFound': ({ title }) => {
    return i18n.t('appError.matchNotFound', 'No episode found for {{title}}', {
      title,
    })
  },
  'source.badResponse': ({ source }) => {
    if (source === undefined) {
      return i18n.t(
        'appError.badResponse',
        "The source sent data that couldn't be read. It may have changed."
      )
    }
    return i18n.t(
      'appError.badResponseSource',
      "{{source}} sent data that couldn't be read. It may have changed.",
      { source: sourceName(source) }
    )
  },
  'catalog.unreachable': () => {
    return i18n.t(
      'appError.catalogUnreachable',
      "Couldn't reach the source catalog. Check your connection and try again."
    )
  },
  'catalog.empty': () => {
    return i18n.t(
      'appError.catalogEmpty',
      'The source catalog has no sources this version can use.'
    )
  },
  'catalog.applyFailed': ({ manifestIds }) => {
    return i18n.t(
      'appError.catalogApplyFailed',
      "Couldn't update {{sources}}. Try again later.",
      { sources: formatList(manifestIds) }
    )
  },
  'backup.notJson': () => {
    return i18n.t(
      'appError.backupNotJson',
      'This file is not a Danmaku Anywhere backup.'
    )
  },
  'backup.invalidFormat': () => {
    return i18n.t(
      'appError.backupInvalidFormat',
      'This backup file is damaged or was not made by Danmaku Anywhere.'
    )
  },
  'backup.unsupportedVersion': () => {
    return i18n.t(
      'appError.backupUnsupportedVersion',
      'This version of Danmaku Anywhere cannot read this backup format.'
    )
  },
  'mount.noActiveFrame': () => {
    return i18n.t('appError.mountNoActiveFrame', 'Video is not detected.')
  },
  'mount.failed': () => {
    return i18n.t('appError.mountFailed', 'The video player did not respond.')
  },
  'shareCode.invalid': () => {
    return i18n.t('appError.shareCodeInvalid', 'This share code is not valid.')
  },
  'importUrl.invalidUrl': () => {
    return i18n.t('appError.importUrlInvalid', 'Not a valid URL.')
  },
  'importUrl.invalidScheme': () => {
    return i18n.t(
      'appError.importUrlScheme',
      'Only http and https URLs are supported.'
    )
  },
  'importUrl.unsupportedExtension': () => {
    return i18n.t(
      'appError.importUrlExtension',
      'URL must point to a .json, .xml, .bin, or .zip file.'
    )
  },
  'importUrl.tooLarge': ({ limit }) => {
    return i18n.t(
      'appError.importUrlTooLarge',
      'File is larger than the {{limit}} limit.',
      { limit }
    )
  },
  unknown: () => {
    return i18n.t('appError.unknown', 'Something went wrong.')
  },
}

const OFFERS_SEARCH: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'network',
  'http',
  'timeout',
  'hostNotAllowed',
  'source.removed',
  'source.episodesUnsupported',
  'source.refetchUnsupported',
  'source.noDanmaku',
  'match.notFound',
  'source.badResponse',
  'unknown',
])

function formatList(items: string[]): string {
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    items
  )
}

function render<C extends AppErrorCode>(error: AppError<C>): string {
  const describe: (params: AppErrorParams[C]) => string = MESSAGES[error.code]
  return describe(error.params)
}

const reported = new WeakSet<object>()

function reportUnclassified(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (reported.has(error)) {
      return
    }
    reported.add(error)
  }
  Logger.warn('Showing a generic message for an unclassified error:', error)
}

export function describeError(error: unknown): ErrorDescription {
  const appError = error instanceof AppError ? error : undefined
  if (appError === undefined) {
    reportUnclassified(error)
  }
  const code: AppErrorCode = appError?.code ?? 'unknown'
  const message = appError ? render(appError) : MESSAGES.unknown({})
  if (!OFFERS_SEARCH.has(code)) {
    return { message }
  }
  return {
    message,
    action: {
      kind: 'openSearch',
      label: i18n.t('integration.alert.openSearch', 'Open search page'),
    },
  }
}
