import { js2xml } from 'xml-js'
import type { CommentEntity } from '../canonical/index.js'

/**
 * Convert comments to XML format compatible with DanDanPlay using json2xml
 */
export const commentsToXml = (comments: CommentEntity[]) => {
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
      maxlimit: { _text: comments.length.toString() },
      state: { _text: '0' },
      real_name: { _text: '0' },
      source: { _text: 'k-v' },
      d: comments.map((comment) => {
        const pParts = comment.p.split(',')
        const [time, mode, color, ...rest] = pParts

        return {
          _attributes: {
            p: [Number.parseInt(time, 10), mode, '25', color, ...rest].join(
              ','
            ),
          },
          _text: comment.m,
        }
      }),
    },
  }

  return js2xml(xmlStructure, { compact: true, spaces: 4 })
}
