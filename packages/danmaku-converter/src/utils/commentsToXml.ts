import { js2xml } from 'xml-js'

/**
 * Convert comments to XML format compatible with DanDanPlay using json2xml
 */
export const commentsToXml = (comments: Array<{ p: string; m: string }>) => {
  const xmlStructure = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'UTF-8',
      },
    },
    i: {
      chatserver: { _text: 'chat.bilibili.com' },
      chatid: { _text: '0' },
      mission: { _text: '0' },
      maxlimit: { _text: '1500' },
      state: { _text: '0' },
      real_name: { _text: '0' },
      source: { _text: 'k-v' },
      d: comments.map((comment) => ({
        _attributes: { p: comment.p },
        _text: comment.m,
      })),
    },
  }

  return js2xml(xmlStructure, { compact: true, spaces: 4 })
}
