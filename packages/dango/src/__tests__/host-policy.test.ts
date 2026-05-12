import { describe, expect, it } from 'vitest'
import {
  isPrivateOrLocalHost,
  validateHostPattern,
} from '../engine/host-policy.js'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

describe('isPrivateOrLocalHost', () => {
  const privateHosts = [
    'localhost',
    'foo.localhost',
    'bar.local',
    '127.0.0.1',
    '127.99.99.99',
    '10.0.0.1',
    '10.255.255.255',
    '192.168.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    '[::1]',
    '::',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
  ]
  for (const h of privateHosts) {
    it(`flags ${h} as local/private`, () => {
      expect(isPrivateOrLocalHost(h)).toBe(true)
    })
  }

  const publicHosts = [
    'api.example.com',
    'api.bilibili.com',
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1', // outside 172.16-31
    '172.15.0.1',
    'example.com',
  ]
  for (const h of publicHosts) {
    it(`allows ${h} as public`, () => {
      expect(isPrivateOrLocalHost(h)).toBe(false)
    })
  }
})

describe('validateHostPattern (manifest load)', () => {
  it('accepts plain public hosts', () => {
    expect(() => validateHostPattern('api.example.com')).not.toThrow()
  })

  it('accepts wildcards on public domains', () => {
    expect(() => validateHostPattern('*.example.com')).not.toThrow()
  })

  it('accepts the literal "*" wildcard (DDP-Compat templates)', () => {
    expect(() => validateHostPattern('*')).not.toThrow()
  })

  it('rejects localhost / private addresses', () => {
    expect(() => validateHostPattern('localhost')).toThrow(/local\/private/)
    expect(() => validateHostPattern('127.0.0.1')).toThrow(/local\/private/)
    expect(() => validateHostPattern('192.168.1.1')).toThrow(/local\/private/)
    expect(() => validateHostPattern('169.254.169.254')).toThrow(
      /local\/private/
    )
  })

  it('rejects .local namespace wildcards', () => {
    expect(() => validateHostPattern('*.local')).toThrow()
    expect(() => validateHostPattern('*.localhost')).toThrow()
  })
})

describe('zManifest rejects private hosts at parse time', () => {
  it('rejects a manifest with a localhost host', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'bad',
        name: 'bad',
        version: '0.1.0',
        hosts: ['localhost'],
      })
    ).toThrow(/local\/private/)
  })

  it('rejects a manifest with a private IPv4 host', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'bad',
        name: 'bad',
        version: '0.1.0',
        hosts: ['192.168.1.1'],
      })
    ).toThrow(/local\/private/)
  })

  it('accepts a manifest with public hosts', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'ok',
        name: 'ok',
        version: '0.1.0',
        hosts: ['api.example.com', '*.example.com'],
      })
    ).not.toThrow()
  })
})

describe('request-time defense-in-depth', () => {
  it('rejects a private host with a non-default port (.hostname check)', async () => {
    /**
     * Regression: pre-fix code used `new URL(url).host` which includes the
     * port, so `127.0.0.1:8080` slipped past `isPrivateOrLocalHost` because
     * the regex/set only matched the bare address. Using `.hostname` strips
     * the port and the check fires.
     */
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'open-template-port',
      name: 'open template (port)',
      version: '0.1.0',
      hosts: ['*'],
      search: {
        inputs: ['baseUrl'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: { method: 'GET', url: 'baseUrl' },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({})
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { baseUrl: 'http://127.0.0.1:8080/' },
        { fetcher }
      )
    ).rejects.toThrow(/local\/private/)
  })

  it('rejects a URL that templates to a private host even if `*` is allowed', async () => {
    /**
     * `hosts: ["*"]` is the DDP-Compat template pattern. The URL is built
     * from a config input — a malicious config could point at 10.0.0.1.
     * The resolved-host check fires regardless of the allowlist.
     */
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'open-template',
      name: 'open template',
      version: '0.1.0',
      hosts: ['*'],
      search: {
        inputs: ['baseUrl'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: {
              method: 'GET',
              url: 'baseUrl',
            },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({})
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { baseUrl: 'http://10.0.0.1/' },
        { fetcher }
      )
    ).rejects.toThrow(/local\/private/)
  })
})
