import { afterAll, describe, expect, it, vi } from 'vitest'
import { APP_ERROR_CODES, AppError, type AppErrorParams } from './AppError'

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
const { describeError } = await import('./describeError')

const BILIBILI = {
  providerConfigId: 'bili-2',
  manifestId: 'bilibili',
  name: 'Bilibili',
}

const PARAMS: { [C in keyof AppErrorParams]: AppErrorParams[C] } = {
  network: { source: BILIBILI },
  http: { status: 503, source: BILIBILI },
  timeout: { source: BILIBILI },
  aborted: {},
  hostNotAllowed: { source: BILIBILI },
  'rpc.unreachable': {},
  'source.removed': {},
  'source.noUrlParser': {},
  'source.urlEpisodeNotFound': {},
  'source.episodesUnsupported': { source: BILIBILI },
  'source.refetchUnsupported': { source: BILIBILI },
  'source.noDanmaku': { title: 'Frieren' },
  'match.notFound': { title: 'Frieren' },
  'source.badResponse': { source: BILIBILI },
  'catalog.unreachable': {},
  'catalog.empty': {},
  'catalog.applyFailed': { manifestIds: ['bilibili', 'tencent'] },
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
  unknown: {},
}

function errorFor(code: keyof AppErrorParams): AppError {
  return new AppError(code, PARAMS[code] as never)
}

async function messagesIn(language: string, errors: AppError[]) {
  await i18n.changeLanguage(language)
  return errors.map((error) => describeError(error).message)
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
      for (const message of [en[i], zh[i]]) {
        expect(message, code).not.toBe('')
        expect(message, code).not.toContain('{{')
        expect(message, code).not.toContain('appError.')
      }
      expect(zh[i], `${code} is not translated`).not.toBe(en[i])
    })
  })

  it('also has both locales for the variants without a source name', async () => {
    const errors = [
      new AppError('network', {}),
      new AppError('http', { status: 500 }),
      new AppError('http', { status: 401 }),
      new AppError('http', { status: 429 }),
      new AppError('timeout', {}),
      new AppError('hostNotAllowed', {}),
      new AppError('source.badResponse', {}),
    ]
    const en = await messagesIn('en', errors)
    const zh = await messagesIn('zh', errors)

    en.forEach((message, i) => {
      expect(message).not.toContain('{{')
      expect(message).not.toContain('Bilibili')
      expect(zh[i]).not.toBe(message)
    })
  })

  it('tells unreachable, auth, rate-limited and server failures apart', async () => {
    const kinds = [
      new AppError('network', { source: BILIBILI }),
      new AppError('http', { status: 401, source: BILIBILI }),
      new AppError('http', { status: 429, source: BILIBILI }),
      new AppError('http', { status: 500, source: BILIBILI }),
    ]
    for (const language of ['en', 'zh']) {
      const messages = await messagesIn(language, kinds)
      expect(new Set(messages).size, language).toBe(kinds.length)
      const [, auth401] = messages
      const [auth403] = await messagesIn(language, [
        new AppError('http', { status: 403, source: BILIBILI }),
      ])
      expect(auth403.replace('403', '401')).toBe(auth401)
      for (const message of messages) {
        expect(message).toContain('Bilibili')
      }
    }
  })

  it('also has both locales for the HTTP kinds with a source', async () => {
    const errors = [401, 429].map(
      (status) => new AppError('http', { status, source: BILIBILI })
    )
    const en = await messagesIn('en', errors)
    const zh = await messagesIn('zh', errors)

    en.forEach((message, i) => {
      expect(message).not.toContain('{{')
      expect(zh[i]).not.toBe(message)
    })
  })

  it('names a built-in source in the active language', async () => {
    const error = new AppError('network', {
      source: {
        providerConfigId: 'dandanplay',
        manifestId: 'dandanplay',
        name: 'DanDanPlay',
      },
    })

    const [en] = await messagesIn('en', [error])
    const [zh] = await messagesIn('zh', [error])

    expect(en).toContain('DanDanPlay')
    expect(zh).toContain('弹弹play')
  })

  it('keeps the name the user gave a source', async () => {
    const error = new AppError('network', {
      source: {
        providerConfigId: 'my-ddp',
        manifestId: 'dandanplay',
        name: 'Home server',
      },
    })

    const [zh] = await messagesIn('zh', [error])

    expect(zh).toContain('Home server')
  })

  it('fills in params', async () => {
    await i18n.changeLanguage('en')

    expect(describeError(errorFor('http')).message).toBe(
      'Bilibili returned an error (HTTP 503). Try again later.'
    )
    expect(describeError(errorFor('catalog.applyFailed')).message).toBe(
      "Couldn't update bilibili and tencent. Try again later."
    )
  })

  it('gives an unclassified error the generic message and logs it', async () => {
    await i18n.changeLanguage('en')
    const { Logger } = await import('@/common/Logger')
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined)
    const raw = new Error('TypeError: Failed to fetch')

    const description = describeError(raw)

    expect(description.message).toBe('Something went wrong.')
    expect(warn).toHaveBeenCalledWith(expect.any(String), raw)
  })

  it('offers the search page for source failures only', () => {
    expect(describeError(errorFor('network')).action?.kind).toBe('openSearch')
    expect(describeError(errorFor('source.noDanmaku')).action?.kind).toBe(
      'openSearch'
    )
    expect(describeError(errorFor('backup.notJson')).action).toBeUndefined()
    expect(describeError(errorFor('mount.failed')).action).toBeUndefined()
  })
})
