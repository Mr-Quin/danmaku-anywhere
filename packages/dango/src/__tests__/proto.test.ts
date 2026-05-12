import protobuf from 'protobufjs'
import { describe, expect, it } from 'vitest'
import { ManifestRunner } from '../engine/ManifestRunner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

/**
 * Minimal proto schema modeling a danmaku segment, modeled on Bilibili's
 * DmSegMobileReply structure simplified for the test. The manifest carries
 * this schema text inline.
 */
const dmSegProto = `
syntax = "proto3";
package dm.v1;
message Item {
  int64 progress = 2;
  int32 mode = 3;
  uint32 color = 8;
  string content = 7;
  string mid_hash = 9;
}
message Segment {
  repeated Item elems = 1;
}
`

/** Build a Segment payload by encoding through protobufjs (the same lib the engine uses). */
function encodeSegment(
  items: Array<{
    progress: number
    mode: number
    color: number
    content: string
    mid_hash?: string
  }>
): Uint8Array {
  const root = protobuf.parse(dmSegProto, { keepCase: true }).root
  const Segment = root.lookupType('dm.v1.Segment')
  const message = Segment.create({ elems: items })
  return Segment.encode(message).finish()
}

describe('format: proto', () => {
  it('decodes a Bilibili-style danmaku segment via manifest-carried .proto', async () => {
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'bilibili-proto-test',
      name: 'Bilibili proto test',
      version: '0.1.0',
      hosts: ['api.bilibili.com'],
      protoSchemas: {
        dm: dmSegProto,
      },
      danmaku: {
        inputs: ['cid'],
        steps: [
          {
            type: 'http',
            id: 'seg',
            request: {
              method: 'GET',
              url: "'https://api.bilibili.com/x/v2/dm/web/seg.so?oid=' & $string(cid)",
              format: 'proto',
              protoSchema: 'dm',
              protoMessage: 'dm.v1.Segment',
            },
          },
        ],
        output:
          "[seg.elems.{ 'time': $number(progress) / 1000.0, 'mode': mode, 'color': color, 'text': content, 'userHash': mid_hash }]",
      },
    })

    const payload = encodeSegment([
      {
        progress: 1000,
        mode: 1,
        color: 16777215,
        content: 'hello',
        mid_hash: 'abc123',
      },
      { progress: 5500, mode: 4, color: 255, content: '世界' },
    ])

    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': { body: payload },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    const result = await runner.runDanmaku({ cid: 12345 })

    expect(result).toEqual([
      {
        time: 1.0,
        mode: 1,
        color: 16777215,
        text: 'hello',
        userHash: 'abc123',
      },
      {
        time: 5.5,
        mode: 4,
        color: 255,
        text: '世界',
        userHash: '',
      },
    ])
  })

  it('errors when protoSchema is unknown', async () => {
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'bad-proto',
      name: 'bad',
      version: '0.1.0',
      hosts: ['api.example.com'],
      protoSchemas: { knownOne: dmSegProto },
      danmaku: {
        inputs: ['x'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x'",
              format: 'proto',
              protoSchema: 'missing',
              protoMessage: 'dm.v1.Segment',
            },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: new Uint8Array(0) },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    await expect(runner.runDanmaku({ x: 1 })).rejects.toThrow(
      /unknown protoSchema "missing"/
    )
  })

  it('errors when protoMessage path does not exist in the schema', async () => {
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'bad-message',
      name: 'bad',
      version: '0.1.0',
      hosts: ['api.example.com'],
      protoSchemas: { dm: dmSegProto },
      danmaku: {
        inputs: ['x'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x'",
              format: 'proto',
              protoSchema: 'dm',
              protoMessage: 'dm.v1.NotARealMessage',
            },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: new Uint8Array(0) },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    await expect(runner.runDanmaku({ x: 1 })).rejects.toThrow()
  })

  it('rejects proto schemas larger than the cap', async () => {
    const huge = `${dmSegProto}\n${'// '.padEnd(64 * 1024 + 10, 'a')}`
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'huge-proto',
      name: 'huge',
      version: '0.1.0',
      hosts: ['api.example.com'],
      protoSchemas: { dm: huge },
      danmaku: {
        inputs: ['x'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x'",
              format: 'proto',
              protoSchema: 'dm',
              protoMessage: 'dm.v1.Segment',
            },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: new Uint8Array(0) },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    await expect(runner.runDanmaku({ x: 1 })).rejects.toThrow(/exceeds/)
  })
})
