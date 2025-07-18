import { describe, expect, it } from 'vitest'
import { zGenericXml } from '../schema'
import { commentsToXml } from './commentsToXml'

describe('commentsToXml', () => {
  it('should convert comments to XML format', async () => {
    const comments = [
      { p: '661.759,1,16777215', m: '战歌起' },
      { p: '368.132,1,16777215', m: '谁懂这一抱啊啊啊啊' },
      { p: '10.5,5,16777215', m: 'Top comment' },
      { p: '368,1,16777215', m: 'int time' },
    ]

    const result = commentsToXml(comments)

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<i>')
    expect(result).toContain('</i>')
    expect(result).toContain('<d p="661,1,25,16777215">战歌起</d>')
    expect(result).toContain('<d p="368,1,25,16777215">谁懂这一抱啊啊啊啊</d>')
    expect(result).toContain('<d p="10,5,25,16777215">Top comment</d>')

    const parsed = await zGenericXml.parseAsync(result)

    expect(parsed).toHaveLength(4)
    // the last comment should match the original
    expect(parsed[3]).toMatchObject(comments[3])
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
      'Text with &lt;tag&gt; &amp; "quotes" &amp; \'apostrophes\''
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
