import {
  HttpException,
  ResponseParseException,
} from '@danmaku-anywhere/danmaku-provider'
import {
  AbortedError,
  Base64DecodeError,
  HostNotAllowedError,
  JsonataTimeoutError,
} from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { fromDangoError, fromProviderApiError } from './providerErrors'

const BILIBILI = {
  providerConfigId: 'bilibili',
  manifestId: 'bilibili',
  name: 'Bilibili',
}
const MACCMS = {
  providerConfigId: 'maccms-1',
  manifestId: 'legacy:maccms',
  name: 'MacCMS',
}

describe('fromDangoError', () => {
  it.each([
    [
      new HostNotAllowedError('private-host-blocked', 'http://127.0.0.1/'),
      'hostNotAllowed',
      { source: BILIBILI },
    ],
    [new AbortedError(), 'aborted', {}],
    [new JsonataTimeoutError('$x'), 'timeout', { source: BILIBILI }],
    [
      new Base64DecodeError('undefined'),
      'source.badResponse',
      { source: BILIBILI },
    ],
  ])('codes %o as %s and keeps it as cause', (engineError, code, params) => {
    const error = fromDangoError(engineError, BILIBILI)

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ code, params })
    expect((error as AppError).cause).toBe(engineError)
  })

  it('leaves an AppError alone', () => {
    const appError = new AppError('source.removed')

    expect(fromDangoError(appError, BILIBILI)).toBe(appError)
  })

  it('leaves an unknown engine failure alone for the log', () => {
    const bug = new TypeError('cannot read properties of undefined')

    expect(fromDangoError(bug, BILIBILI)).toBe(bug)
  })
})

describe('fromProviderApiError', () => {
  it('codes a status 0 HttpException as network', () => {
    const failure = new HttpException('Failed to fetch', 0, 'Network Error')

    const error = fromProviderApiError(failure, MACCMS)

    expect(error).toMatchObject({
      code: 'network',
      params: { source: MACCMS },
    })
    expect((error as AppError).cause).toBe(failure)
  })

  it('codes an HttpException with a status as http', () => {
    const error = fromProviderApiError(
      new HttpException('Request failed with status 404', 404, 'Not Found')
    )

    expect(error).toMatchObject({ code: 'http', params: { status: 404 } })
  })

  it('codes a ResponseParseException as a bad response', () => {
    const error = fromProviderApiError(new ResponseParseException(), MACCMS)

    expect(error).toMatchObject({
      code: 'source.badResponse',
      params: { source: MACCMS },
    })
  })

  it('leaves any other error alone', () => {
    const other = new Error('boom')

    expect(fromProviderApiError(other)).toBe(other)
  })
})
