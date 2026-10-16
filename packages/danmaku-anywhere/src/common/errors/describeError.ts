import { z } from 'zod'
import { Logger } from '@/common/Logger'
import { formatList } from '@/common/localization/formatList'
import { i18n } from '@/common/localization/i18n'
import {
  localizedStoreName,
  storeTrimAdvice,
} from '@/common/options/storeMessages'
import {
  AppError,
  type AppErrorCode,
  type AppErrorParams,
  type AppErrorParamsArg,
  type ErrorTarget,
} from './AppError'
import { errorMessage } from './errorMessage'
import { isErrorLike } from './isErrorLike'

export interface ErrorDescription {
  message: string
}

type MessageTable = {
  [C in AppErrorCode]: (params: AppErrorParams[C]) => string
}

function targetName(target: ErrorTarget | undefined): string {
  if (target === undefined) {
    return i18n.t('appError.target.server', 'the server')
  }
  switch (target.kind) {
    case 'source':
      return target.ref.name
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
      { source: source.name }
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
  'source.urlTitleNotFound': ({ source }) => {
    return i18n.t(
      'appError.urlTitleNotFound',
      '{{source}} has nothing at this link. The title may have been removed or not be available in your region.',
      { source: source.name }
    )
  },
  'source.urlEpisodeNotFound': () => {
    return i18n.t(
      'appError.urlEpisodeNotFound',
      'The link was recognized, but its episode could not be found.'
    )
  },
  'source.unavailable': ({ source, reason }) => {
    const name = source.name
    switch (reason) {
      case 'not-registered':
        return i18n.t(
          'appError.sourceNotRegistered',
          "{{source}} isn't installed. Add it again from Sources.",
          { source: name }
        )
      case 'needs-newer-extension':
        return i18n.t(
          'appError.sourceNeedsNewerExtension',
          '{{source}} needs a newer version of Danmaku Anywhere.',
          { source: name }
        )
      case 'invalid-manifest':
        return i18n.t(
          'appError.sourceInvalidManifest',
          "{{source}} is damaged and can't run. Reinstall or replace it in Sources.",
          { source: name }
        )
    }
  },
  'source.searchUnsupported': ({ source }) => {
    return i18n.t('appError.searchUnsupported', '{{source}} cannot search.', {
      source: source.name,
    })
  },
  'source.episodesUnsupported': ({ source }) => {
    return i18n.t(
      'appError.episodesUnsupported',
      '{{source}} cannot list episodes.',
      { source: source.name }
    )
  },
  'source.danmakuUnsupported': ({ source }) => {
    return i18n.t(
      'appError.danmakuUnsupported',
      '{{source}} cannot fetch danmaku.',
      { source: source.name }
    )
  },
  'source.seasonRefreshUnsupported': ({ source }) => {
    return i18n.t(
      'appError.seasonRefreshUnsupported',
      '{{source}} cannot refresh season details.',
      { source: source.name }
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
  badResponse: ({ target }) => {
    return i18n.t(
      'appError.badResponse',
      "Couldn't read the data from {{target}}. It may have changed.",
      { target: targetName(target) }
    )
  },
  'manifest.unavailable': ({ reason }) => {
    switch (reason) {
      case 'not-registered':
        return i18n.t(
          'appError.manifestNotRegistered',
          "This source isn't installed. Add it again from Sources."
        )
      case 'needs-newer-extension':
        return i18n.t(
          'appError.manifestNeedsNewerExtension',
          'This source needs a newer version of Danmaku Anywhere.'
        )
      case 'invalid-manifest':
        return i18n.t(
          'appError.manifestInvalid',
          "This source is damaged and can't run. Reinstall or replace it in Sources."
        )
    }
  },
  'manifest.badOutput': ({ source, pipeline, detail }) => {
    if (source) {
      return i18n.t(
        'appError.sourceBadOutput',
        "{{source}} sent data this version can't read. It may have changed.",
        { source: source.name }
      )
    }
    return i18n.t(
      'appError.manifestBadOutput',
      'The {{pipeline}} output does not match what the extension expects: {{detail}}',
      { pipeline, detail }
    )
  },
  'manifest.rejected': ({ reason, detail }) => {
    switch (reason) {
      case 'save-needs-newer-extension':
        return i18n.t(
          'appError.manifestNeedsNewerExtensionToSave',
          'This manifest needs a newer version of Danmaku Anywhere.'
        )
      case 'save-id-changed':
        return i18n.t(
          'appError.manifestIdChanged',
          "A manifest's id cannot be changed. Save it as a new manifest instead."
        )
      case 'save-duplicate-id':
        return i18n.t(
          'appError.manifestDuplicateId',
          'A source with this id is already installed.'
        )
      case 'save-not-user':
      case 'delete-not-user':
        return i18n.t(
          'appError.manifestNotUser',
          'Only manifests you added can be changed or deleted.'
        )
      case 'reinstall-not-broken':
        return i18n.t(
          'appError.manifestNotReinstallable',
          'Only a damaged built-in source can be reinstalled.'
        )
      case 'save-invalid':
        if (detail) {
          return i18n.t(
            'appError.manifestRejectedDetail',
            'This manifest is not valid: {{detail}}',
            { detail }
          )
        }
        return i18n.t(
          'appError.manifestRejected',
          'This manifest is not valid.'
        )
    }
  },
  'catalog.empty': () => {
    return i18n.t(
      'appError.catalogEmpty',
      'The source catalog has no sources this version can use.'
    )
  },
  'catalog.applyFailed': ({ sources }) => {
    return i18n.t(
      'appError.catalogApplyFailed',
      "Couldn't update {{sources}}. Try again later.",
      { sources: formatList(sources.map((source) => source.name)) }
    )
  },
  'config.duplicate': ({ manifestId }) => {
    if (manifestId !== undefined) {
      return i18n.t(
        'providers.error.duplicate',
        'This built-in source is already installed'
      )
    }
    return i18n.t(
      'appError.configDuplicate',
      'An item with the same ID already exists.'
    )
  },
  'config.notFound': () => {
    return i18n.t(
      'appError.configNotFound',
      'This item no longer exists. It may have been deleted.'
    )
  },
  'config.invalid': () => {
    return i18n.t('appError.configInvalid', 'Some settings are not valid.')
  },
  'config.nameRequired': () => {
    return i18n.t('providers.error.nameRequired', 'Give the source a name')
  },
  'config.nameTooLong': ({ max }) => {
    return i18n.t(
      'providers.error.nameTooLong',
      'A source name can be at most {{max}} characters',
      { max }
    )
  },
  'config.notBuiltin': () => {
    return i18n.t(
      'providers.error.notBuiltin',
      'This source has no built-in instance'
    )
  },
  'config.orderMismatch': () => {
    return i18n.t(
      'providers.error.orderMismatch',
      'The source list changed. Try reordering again.'
    )
  },
  'options.itemTooLarge': ({ store }) => {
    return i18n.t(
      'appError.optionsItemTooLarge',
      "{{name}}: It is too large for the browser's synced storage. {{advice}}",
      { name: localizedStoreName(store), advice: storeTrimAdvice(store) }
    )
  },
  'options.storeFull': ({ store }) => {
    return i18n.t(
      'appError.optionsStoreFull',
      "{{name}}: The browser's storage for this extension's settings is full. Remove some sources, configs or block rules to make room.",
      { name: localizedStoreName(store) }
    )
  },
  'options.writeRateLimited': ({ store }) => {
    return i18n.t(
      'appError.optionsWriteRateLimited',
      '{{name}}: It was saved too many times in a short while. Try again in a minute.',
      { name: localizedStoreName(store) }
    )
  },
  'options.incomplete': ({ store }) => {
    return i18n.t(
      'appError.optionsIncomplete',
      '{{name}}: The stored copy is incomplete, possibly because it is still syncing from another device. Try again in a moment.',
      { name: localizedStoreName(store) }
    )
  },
  'options.migration': ({ store }) => {
    return i18n.t(
      'appError.optionsMigration',
      '{{name}}: The saved data is damaged or in a shape this version cannot convert.',
      { name: localizedStoreName(store) }
    )
  },
  'options.upgradeFailed': ({ stores }) => {
    return i18n.t(
      'appError.optionsUpgradeFailed',
      'These settings could not be updated for this version and have been kept as they were: {{stores}}.',
      {
        stores: formatList(
          stores.map(({ store }) => localizedStoreName(store))
        ),
      }
    )
  },
  'options.outdated': () => {
    return i18n.t(
      'providers.error.outdated',
      'Your sources are being updated to this version. Try again in a moment.'
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
  'backup.recoveryUnrestorable': ({ store }) => {
    return i18n.t(
      'appError.backupRecoveryUnrestorable',
      'This recovery file of {{name}} holds data that cannot be restored, such as settings that were saved incomplete. Keep it for reference.',
      { name: localizedStoreName(store) }
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

function unknownMessage(): string {
  return i18n.t('appError.unknown', 'Something went wrong.')
}

const reportedObjects = new WeakSet<object>()

function report(note: string, error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (reportedObjects.has(error)) {
      return
    }
    reportedObjects.add(error)
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

// For failures raised here whose own text is meant for the user, such as a
// form's validation. A coded error still gets its translated text.
export function describeLocalError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error)
  }
  if (error instanceof AppError || !isErrorLike(error) || !error.message) {
    return describeError(error).message
  }
  return error.message
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
