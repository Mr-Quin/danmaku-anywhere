import { Logger } from '@/common/Logger'
import { i18n } from '@/common/localization/i18n'
import { builtinDisplayName } from '@/common/options/providerConfig/builtinNames'
import {
  AppError,
  type AppErrorCode,
  type AppErrorParams,
  type AppErrorParamsArg,
  type ErrorTarget,
  type SourceRef,
} from './AppError'
import { errorMessage } from './errorMessage'

export interface ErrorDescription {
  message: string
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

function targetName(target: ErrorTarget | undefined): string {
  if (target === undefined) {
    return i18n.t('appError.target.server', 'the server')
  }
  switch (target.kind) {
    case 'source':
      return sourceName(target.ref)
    case 'catalog':
      return i18n.t('appError.target.catalog', 'the source catalog')
    case 'cloud':
      return i18n.t('appError.target.cloud', 'the cloud backup service')
  }
}

function describeHttp(status: number, target: string): string {
  if (status === 401 || status === 403) {
    return i18n.t(
      'appError.httpAuth',
      'The request to {{target}} was refused (HTTP {{status}}). You may need to sign in.',
      { target, status }
    )
  }
  if (status === 429) {
    return i18n.t(
      'appError.httpRateLimited',
      'Too many requests to {{target}}. Wait a moment and try again.',
      { target }
    )
  }
  return i18n.t(
    'appError.http',
    'Got an error from {{target}} (HTTP {{status}}). Try again later.',
    { target, status }
  )
}

const MESSAGES: MessageTable = {
  network: ({ target }) => {
    return i18n.t(
      'appError.network',
      "Couldn't reach {{target}}. Check your connection and try again.",
      { target: targetName(target) }
    )
  },
  http: ({ status, target }) => {
    return describeHttp(status, targetName(target))
  },
  timeout: ({ target }) => {
    return i18n.t('appError.timeout', 'Timed out waiting for {{target}}.', {
      target: targetName(target),
    })
  },
  aborted: () => {
    return i18n.t('appError.aborted', 'The request was cancelled.')
  },
  hostNotAllowed: ({ source }) => {
    return i18n.t(
      'appError.hostNotAllowed',
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
  'source.badResponse': ({ target }) => {
    return i18n.t(
      'appError.badResponse',
      "Couldn't read the data from {{target}}. It may have changed.",
      { target: targetName(target) }
    )
  },
  'catalog.empty': () => {
    return i18n.t(
      'appError.catalogEmpty',
      'The source catalog has no sources this version can use.'
    )
  },
  'catalog.applyFailed': ({ sources }) => {
    const names = sources.map((source) => {
      return builtinDisplayName(
        {
          id: source.manifestId,
          manifestId: source.manifestId,
          name: source.name,
        },
        i18n.language
      )
    })
    return i18n.t(
      'appError.catalogApplyFailed',
      "Couldn't update {{sources}}. Try again later.",
      { sources: formatList(names) }
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
}

function formatList(items: string[]): string {
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    items
  )
}

function unknownMessage(): string {
  return i18n.t('appError.unknown', 'Something went wrong.')
}

const reportedObjects = new WeakSet<object>()
const reportedValues = new Set<string>()

function report(note: string, error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (reportedObjects.has(error)) {
      return
    }
    reportedObjects.add(error)
  } else {
    const key = `${typeof error}:${String(error)}`
    if (reportedValues.has(key)) {
      return
    }
    reportedValues.add(key)
  }
  Logger.warn(note, error)
}

export function describeCode<C extends AppErrorCode>(
  code: C,
  ...[params]: AppErrorParamsArg<C>
): string {
  const describe: (params: AppErrorParams[C]) => string = MESSAGES[code]
  return describe(params ?? ({} as AppErrorParams[C]))
}

export function describeError(error: unknown): ErrorDescription {
  if (!(error instanceof AppError)) {
    report('Showing a generic message for an unclassified error:', error)
    return { message: unknownMessage() }
  }
  try {
    const code: AppErrorCode = error.code
    const describe = MESSAGES[code] as (params: unknown) => string
    return { message: describe(error.params) }
  } catch (e) {
    report(`Could not describe an error (${errorMessage(e)}):`, error)
    return { message: unknownMessage() }
  }
}
