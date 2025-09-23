import { naturalSort } from './utils'

describe('naturalSort', () => {
  it('should sort episode numbers naturally (fixes the reported issue)', () => {
    // This test case specifically addresses the issue shown in the screenshot
    // where 第10集 appears before 第100集 due to string sorting
    const episodes = [
      '第100集',
      '第01集',
      '第10集',
      '第02集',
      '第03集',
      '第101集',
      '第11集',
      '第120集',
      '第109集',
      '第110集',
    ]

    const sorted = episodes.sort(naturalSort)

    // Verify that episodes are in numerical order
    expect(sorted).toEqual([
      '第01集',
      '第02集',
      '第03集',
      '第10集', // This should come AFTER 第03集, not before 第100集
      '第11集',
      '第100集',
      '第101集',
      '第109集',
      '第110集',
      '第120集',
    ])
  })

  it('should handle mixed content with numbers and text', () => {
    const items = ['item10', 'item2', 'item1', 'item20', 'item3']

    const sorted = items.sort(naturalSort)

    expect(sorted).toEqual(['item1', 'item2', 'item3', 'item10', 'item20'])
  })

  it('should handle strings without numbers normally', () => {
    const items = ['banana', 'apple', 'cherry']

    const sorted = items.sort(naturalSort)

    expect(sorted).toEqual(['apple', 'banana', 'cherry'])
  })

  it('should handle empty strings and single character strings', () => {
    const items = ['', 'a', 'z', 'b']

    const sorted = items.sort(naturalSort)

    expect(sorted).toEqual(['', 'a', 'b', 'z'])
  })

  it('should handle numbers at the beginning correctly', () => {
    const items = ['1abc', '10abc', '2abc', '20abc']

    const sorted = items.sort(naturalSort)

    expect(sorted).toEqual(['1abc', '2abc', '10abc', '20abc'])
  })

  it('should handle multiple numeric segments', () => {
    const items = ['v1.10.2', 'v1.2.1', 'v1.10.10', 'v1.2.10']

    const sorted = items.sort(naturalSort)

    expect(sorted).toEqual(['v1.2.1', 'v1.2.10', 'v1.10.2', 'v1.10.10'])
  })

  it('should demonstrate the fix for the core issue: 第10集 vs 第100集', () => {
    // Direct comparison test to verify the core sorting issue is fixed
    const result = naturalSort('第10集', '第100集')

    expect(result).toBeLessThan(0) // 第10集 should come before 第100集

    // Verify the opposite is also correct
    const reverseResult = naturalSort('第100集', '第10集')
    expect(reverseResult).toBeGreaterThan(0) // 第100集 should come after 第10集
  })
})
