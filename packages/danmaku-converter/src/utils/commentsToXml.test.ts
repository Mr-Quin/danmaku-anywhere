import { describe, expect, it } from 'vitest'
import { commentsToXml } from './index.js'

describe('commentsToXml', () => {
  it('should convert comments to XML format', () => {
    const comments = [
      { p: '661.759,1,16777215', m: '战歌起' },
      { p: '368.132,1,16777215', m: '谁懂这一抱啊啊啊啊' },
      { p: '10.5,5,255', m: 'Top comment' },
    ]

    const result = commentsToXml(comments)

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<i>')
    expect(result).toContain('</i>')
    expect(result).toContain('<d p="661.759,1,16777215">战歌起</d>')
    expect(result).toContain('<d p="368.132,1,16777215">谁懂这一抱啊啊啊啊</d>')
    expect(result).toContain('<d p="10.5,5,255">Top comment</d>')
  })

  it('should escape XML special characters', () => {
    const comments = [
      {
        p: '1.0,1,16777215',
        m: 'Text with <tag> & "quotes" & \'apostrophes\'',
      },
    ]

    const result = commentsToXml(comments)

    expect(result).toContain(
      '&lt;tag&gt; &amp; &quot;quotes&quot; &amp; &apos;apostrophes&apos;'
    )
  })

  it('should handle empty comments array', () => {
    const result = commentsToXml([])

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<i>')
    expect(result).toContain('</i>')
    expect(result).not.toContain('<d p=')
  })
})
