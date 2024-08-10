import { describe, expect, it } from 'vitest'

import { xmlToJSON } from '../xml/index.js'

import { bilibiliSchema } from './bilibiliSchema.js'

const iqyData = {
  i: {
    chatserver: { _text: 'cmts.iqiyi.com' },
    chatid: { _text: '9000000005439200' },
    count: { _text: '32259' },
    d: [
      {
        _attributes: {
          p: '1,1,25,16777215,0,0,1336434046,1593741798891001825',
        },
        _text: '缺点是头发太干净了',
      },
    ],
  },
}

const bilibiliXmlData = `
<?xml version="1.0" encoding="UTF-8"?>
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>500001319477354</chatid>
    <mission>0</mission>
    <maxlimit>1500</maxlimit>
    <state>0</state>
    <real_name>0</real_name>
    <source>k-v</source>
    <d p="661.75900,1,25,16777215,1722612346,0,dcea39e9,1640150253296739072,10">战歌起</d>
    <d p="368.13200,1,25,16777215,1722065258,0,6a666376,1635560942807178752,10">谁懂这一抱啊啊啊啊</d>
</i>
`

const bilibiliData = {
  _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
  i: {
    chatserver: { _text: 'chat.bilibili.com' },
    chatid: { _text: '500001319477354' },
    mission: { _text: '0' },
    maxlimit: { _text: '1500' },
    state: { _text: '0' },
    real_name: { _text: '0' },
    source: { _text: 'k-v' },
    d: [
      {
        _attributes: {
          p: '661.759,1,25,16777215,1722612346,0,dcea39e9,1640150253296739072,10',
        },
        _text: '战歌起',
      },
    ],
  },
}

describe('bilibiliSchema', () => {
  it('should parse iqy', () => {
    const result = bilibiliSchema.parse(iqyData)
    expect(result).toEqual({
      comments: [
        {
          p: '1,1,16777215',
          m: '缺点是头发太干净了',
        },
      ],
    })
  })

  it('should parse bilibili json', () => {
    const result = bilibiliSchema.parse(bilibiliData)
    expect(result).toEqual({
      comments: [
        {
          p: '661.759,1,16777215',
          m: '战歌起',
        },
      ],
    })
  })

  it('should parse bilibili xml', async () => {
    const data = await xmlToJSON(bilibiliXmlData)
    const result = bilibiliSchema.parse(data)
    expect(result).toEqual({
      comments: [
        {
          p: '661.759,1,16777215',
          m: '战歌起',
        },
        {
          p: '368.132,1,16777215',
          m: '谁懂这一抱啊啊啊啊',
        },
      ],
    })
  })
})
