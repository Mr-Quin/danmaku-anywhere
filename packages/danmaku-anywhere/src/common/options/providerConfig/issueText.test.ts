import { type ConfigSchema, validateConfig } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { OptionsOutdatedError } from '@/common/options/OptionsService/OptionsOutdatedError'
import { RpcException } from '@/common/rpc/types'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { describeProviderConfigError } from './issueText'
import { ProviderConfigError } from './ProviderConfigError'

/**
 * describeProviderConfigError turns a failed source write into one line of
 * text after the error has crossed the RPC boundary: settings issues name
 * their field by the titles in the manifest's configSchema, and a store an
 * older build tagged gets its own message. The i18n mock returns keys.
 */

function acrossRpc(error: Error): RpcException {
  return new RpcException(error.message, {
    cause: deserializeError(serializeError(error)),
  })
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
      new ProviderConfigError(
        { code: 'config.invalid', params: { issues } },
        'Invalid source settings'
      )
    )

    expect(describeProviderConfigError(error, schema)).toBe(
      'Authentication › Headers › #1 › Value: providers.editor.validation.required'
    )
    expect(describeProviderConfigError(error)).toBe(
      'auth › headers › #1 › value: providers.editor.validation.required'
    )
  })

  it('explains a store an older build tagged', () => {
    const error = acrossRpc(new OptionsOutdatedError('providerConfig', 5, 6))

    expect(describeProviderConfigError(error)).toBe('providers.error.outdated')
  })

  it('leaves other errors to the caller', () => {
    expect(describeProviderConfigError(new Error('boom'))).toBeUndefined()
  })
})
