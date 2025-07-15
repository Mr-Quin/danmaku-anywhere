import { describe, expect, it } from 'vitest'
import { commentsToXml, xmlToComments } from './index.js'

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

describe('xmlToComments', () => {
  it('should convert XML back to comments array', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
    <mission>0</mission>
    <maxlimit>1500</maxlimit>
    <state>0</state>
    <real_name>0</real_name>
    <source>k-v</source>
    <d p="661.759,1,16777215">战歌起</d>
    <d p="368.132,1,16777215">谁懂这一抱啊啊啊啊</d>
    <d p="10.5,5,255">Top comment</d>
</i>`

    const result = xmlToComments(xml)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ p: '661.759,1,16777215', m: '战歌起' })
    expect(result[1]).toEqual({
      p: '368.132,1,16777215',
      m: '谁懂这一抱啊啊啊啊',
    })
    expect(result[2]).toEqual({ p: '10.5,5,255', m: 'Top comment' })
  })

  it('should handle XML with special characters', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
    <d p="1.0,1,16777215">Text with &lt;tag&gt; &amp; "quotes" &amp; 'apostrophes'</d>
</i>`

    const result = xmlToComments(xml)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      p: '1.0,1,16777215',
      m: 'Text with <tag> & "quotes" & \'apostrophes\'',
    })
  })

  it('should handle single comment XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
    <d p="1.0,1,16777215">Single comment</d>
</i>`

    const result = xmlToComments(xml)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ p: '1.0,1,16777215', m: 'Single comment' })
  })

  it('should handle empty XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
</i>`

    const result = xmlToComments(xml)

    expect(result).toHaveLength(0)
  })

  it('should round-trip convert comments', () => {
    const originalComments = [
      { p: '661.759,1,16777215', m: '战歌起' },
      { p: '368.132,1,16777215', m: '谁懂这一抱啊啊啊啊' },
      { p: '10.5,5,255', m: 'Text with <tag> & "quotes"' },
    ]

    const xml = commentsToXml(originalComments)
    const convertedComments = xmlToComments(xml)

    expect(convertedComments).toEqual(originalComments)
  })
})
