import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  APP_ERROR_CODES,
  AppError,
  type AppErrorParams,
  type ErrorTarget,
} from './AppError'

vi.mock('@/common/localization/i18n', async () => {
  const { createInstance } = await import('i18next')
  const { resources } = await import('@/common/localization/resources')
  const instance = createInstance()
  await instance.init({
    resources,
    lng: 'en',
    interpolation: { escapeValue: false },
  })
  return { i18n: instance }
})

const { i18n } = await import('@/common/localization/i18n')
const { describeCode, describeError, describeLocalError } = await import(
  './describeError'
)

const BILIBILI = {
  providerConfigId: 'bili-2',
  manifestId: 'bilibili',
  name: 'Bilibili',
}

const SOURCE: ErrorTarget = { kind: 'source', ref: BILIBILI }

const PARAMS: { [C in keyof AppErrorParams]: AppErrorParams[C] } = {
  network: { target: SOURCE },
  http: { status: 503, target: SOURCE },
  timeout: { target: SOURCE },
  aborted: {},
  hostNotAllowed: { source: BILIBILI },
  'rpc.unreachable': {},
  'source.removed': {},
  'source.noUrlParser': {},
  'source.urlEpisodeNotFound': {},
  'source.urlTitleNotFound': { source: BILIBILI },
  'source.unavailable': { source: BILIBILI, reason: 'not-registered' },
  'source.searchUnsupported': { source: BILIBILI },
  'source.episodesUnsupported': { source: BILIBILI },
  'source.danmakuUnsupported': { source: BILIBILI },
  'source.seasonRefreshUnsupported': { source: BILIBILI },
  'source.noDanmaku': { title: 'Frieren' },
  badResponse: { target: SOURCE },
  'manifest.unavailable': {
    manifestId: 'bilibili',
    reason: 'needs-newer-extension',
  },
  'manifest.badOutput': {
    manifestId: 'bilibili',
    pipeline: 'search',
    reason: 'no-valid-rows',
    detail: '[0] title: expected string',
    source: BILIBILI,
  },
  'manifest.rejected': { reason: 'save-invalid' },
  'match.notFound': { title: 'Frieren' },
  'catalog.empty': {},
  'config.duplicate': {},
  'config.notFound': {},
  'catalog.applyFailed': {
    sources: [
      { manifestId: 'bilibili', name: 'Bilibili' },
      { manifestId: 'iqiyi', name: 'iQIYI' },
    ],
  },
  'backup.notJson': {},
  'backup.invalidFormat': {},
  'backup.unsupportedVersion': {},
  'mount.noActiveFrame': {},
  'mount.failed': {},
  'shareCode.invalid': {},
  'importUrl.invalidUrl': {},
  'importUrl.invalidScheme': {},
  'importUrl.unsupportedExtension': {},
  'importUrl.tooLarge': { limit: '500 MB' },
}

function errorFor(code: keyof AppErrorParams): AppError {
  return new AppError(code, PARAMS[code] as never)
}

async function messagesIn(language: string, errors: AppError[]) {
  await i18n.changeLanguage(language)
  return errors.map((error) => describeError(error).message)
}

function expectBothLocales(en: string[], zh: string[], label: string) {
  en.forEach((message, i) => {
    for (const text of [message, zh[i]]) {
      expect(text, label).not.toBe('')
      expect(text, label).not.toContain('{{')
      expect(text, label).not.toContain('appError.')
    }
    expect(zh[i], `${label} ${i} is not translated`).not.toBe(message)
  })
}

describe('describeError', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('has localized text for every code in English and Chinese', async () => {
    const errors = APP_ERROR_CODES.map(errorFor)
    const en = await messagesIn('en', errors)
    const zh = await messagesIn('zh', errors)

    APP_ERROR_CODES.forEach((code, i) => {
      expectBothLocales([en[i]], [zh[i]], code)
    })
  })

  it('has both locales for every target of the transport codes', async () => {
    const targets: (ErrorTarget | undefined)[] = [
      undefined,
      SOURCE,
      { kind: 'catalog' },
      { kind: 'cloud' },
    ]
    const errors = targets.flatMap((target) => [
      new AppError('network', { target }),
      new AppError('http', { status: 401, target }),
      new AppError('http', { status: 429, target }),
      new AppError('http', { status: 500, target }),
      new AppError('timeout', { target }),
      new AppError('badResponse', { target }),
    ])
    const en = await messagesIn('en', errors)
    const zh = await messagesIn('zh', errors)

    expectBothLocales(en, zh, 'transport')
  })

  it('names the target the failure came from', async () => {
    const [catalog, cloud, server] = await messagesIn('en', [
      new AppError('http', { status: 500, target: { kind: 'catalog' } }),
      new AppError('network', { target: { kind: 'cloud' } }),
      new AppError('network', {}),
    ])

    expect(catalog).toBe(
      'Got an error from the source catalog (HTTP 500). Try again later.'
    )
    expect(cloud).toContain('the cloud backup service')
    expect(server).toContain('the server')
  })

  it('tells unreachable, auth, rate-limited and server failures apart', async () => {
    const kinds = [
      new AppError('network', { target: SOURCE }),
      new AppError('http', { status: 401, target: SOURCE }),
      new AppError('http', { status: 429, target: SOURCE }),
      new AppError('http', { status: 500, target: SOURCE }),
    ]
    for (const language of ['en', 'zh']) {
      const messages = await messagesIn(language, kinds)
      expect(new Set(messages).size, language).toBe(kinds.length)
      const [, auth401] = messages
      const [auth403] = await messagesIn(language, [
        new AppError('http', { status: 403, target: SOURCE }),
      ])
      expect(auth403.replace('403', '401')).toBe(auth401)
      for (const message of messages) {
        expect(message).toContain('Bilibili')
      }
    }
  })

  it('names a built-in source in the active language', async () => {
    const error = new AppError('network', {
      target: {
        kind: 'source',
        ref: {
          providerConfigId: 'dandanplay',
          manifestId: 'dandanplay',
          name: 'DanDanPlay',
        },
      },
    })

    const [en] = await messagesIn('en', [error])
    const [zh] = await messagesIn('zh', [error])

    expect(en).toContain('DanDanPlay')
    expect(zh).toContain('弹弹play')
  })

  it('keeps the name the user gave a source', async () => {
    const error = new AppError('network', {
      target: {
        kind: 'source',
        ref: {
          providerConfigId: 'my-ddp',
          manifestId: 'dandanplay',
          name: 'Home server',
        },
      },
    })

    const [zh] = await messagesIn('zh', [error])

    expect(zh).toContain('Home server')
  })

  it('names the sources an update could not apply', async () => {
    const [en] = await messagesIn('en', [errorFor('catalog.applyFailed')])
    const [zh] = await messagesIn('zh', [errorFor('catalog.applyFailed')])

    expect(en).toBe("Couldn't update Bilibili and iQIYI. Try again later.")
    expect(zh).toContain('B站')
  })

  it('describes a code without building an error', async () => {
    await i18n.changeLanguage('en')

    expect(describeCode('match.notFound', { title: 'Frieren' })).toBe(
      describeError(errorFor('match.notFound')).message
    )
  })

  it('gives an unclassified error the generic message and logs each error object once', async () => {
    await i18n.changeLanguage('en')
    const { Logger } = await import('@/common/Logger')
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined)
    const raw = new Error('TypeError: Failed to fetch')

    expect(describeError(raw).message).toBe('Something went wrong.')
    describeError(raw)
    describeError('thrown string')

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledWith(expect.any(String), raw)
  })

  it('falls back to the generic message when params do not fit the code', async () => {
    await i18n.changeLanguage('en')
    const { Logger } = await import('@/common/Logger')
    vi.spyOn(Logger, 'warn').mockImplementation(() => undefined)
    const malformed = [
      new AppError('source.episodesUnsupported', {} as never),
      new AppError('catalog.applyFailed', { sources: 'bilibili' } as never),
    ]

    for (const error of malformed) {
      expect(describeError(error).message).toBe('Something went wrong.')
    }
  })
})

describe('describeLocalError', () => {
  it('shows the message of a local error', () => {
    expect(describeLocalError(new Error('Name is required'))).toBe(
      'Name is required'
    )
  })

  it('shows a schema failure as readable issues', async () => {
    const { z } = await import('zod')
    const failure = z.object({ name: z.string() }).safeParse({ name: 1 })

    expect(failure.success).toBe(false)
    expect(describeLocalError(failure.error)).toContain('name')
  })

  it('translates a coded error instead of showing its log message', async () => {
    await i18n.changeLanguage('en')
    const error = new AppError(
      'rpc.unreachable',
      {},
      { message: 'Method x could not be delivered' }
    )

    expect(describeLocalError(error)).toBe(describeError(error).message)
    expect(describeLocalError(error)).not.toContain('rpc.unreachable')
  })
})
