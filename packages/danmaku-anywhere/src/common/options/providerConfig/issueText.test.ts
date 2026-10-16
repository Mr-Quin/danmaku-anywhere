import { type ConfigSchema, validateConfig } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { describeProviderConfigError } from './issueText'

/**
 * describeProviderConfigError turns a failed source write into one line of
 * text after the error has crossed the RPC boundary: settings issues name
 * their field by the titles in the manifest's configSchema, and a store an
 * older build tagged gets its own message. The i18n mock returns keys.
 */

function acrossRpc(error: Error): Error {
  return deserializeError(serializeError(error))
}

const schema: ConfigSchema = {
  type: 'object',
  properties: {
    auth: {
      type: 'object',
      title: 'Authentication',
      properties: {
        headers: {
          type: 'array',
          title: 'Headers',
          items: {
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string', title: 'Value' } },
          },
        },
      },
    },
  },
}

describe('describeProviderConfigError', () => {
  it('names an invalid field by its titles', () => {
    const issues = validateConfig(schema, { auth: { headers: [{}] } })
    const error = acrossRpc(
      new AppError(
        'config.invalid',
        { issues },
        { message: 'Invalid source settings' }
      )
    )

    expect(describeProviderConfigError(error, schema)).toBe(
      'Authentication › Headers › #1 › Value: providers.editor.validation.required'
    )
    expect(describeProviderConfigError(error)).toBe(
      'auth › headers › #1 › value: providers.editor.validation.required'
    )
  })

  it('describes a URL with a scheme other than http or https', () => {
    const error = acrossRpc(
      new AppError('config.invalid', {
        issues: [
          {
            path: ['baseUrl'],
            code: 'urlScheme',
            message: 'URL must use http or https',
            params: {
              format: 'uri',
              scheme: 'ftp',
              allowed: ['http', 'https'],
            },
          },
        ],
      })
    )

    expect(describeProviderConfigError(error)).toBe(
      'baseUrl: providers.editor.validation.urlScheme'
    )
  })

  it('gives an issue code it does not know the generic field text', () => {
    const error = acrossRpc(
      new AppError('config.invalid', {
        issues: [
          {
            path: ['baseUrl'],
            code: 'someFutureCode',
            message: 'English text from the engine',
          },
        ],
      })
    )

    expect(describeProviderConfigError(error)).toBe(
      'baseUrl: providers.editor.validation.invalid'
    )
  })

  it('explains a store an older build tagged', () => {
    const error = acrossRpc(
      new AppError('options.outdated', {
        store: 'providerConfig',
        version: 5,
        expected: 6,
      })
    )

    expect(describeProviderConfigError(error)).toBe('providers.error.outdated')
  })

  it('gives an error from outside the error model the generic text', () => {
    expect(describeProviderConfigError(new Error('boom'))).toBe(
      'appError.unknown'
    )
  })
})
