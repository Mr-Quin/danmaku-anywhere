const unitMap: Record<string, number> = {
  十: 10,
  拾: 10,
  百: 100,
  佰: 100,
  千: 1000,
  仟: 1000,
  万: 10000,
  萬: 10000,
}

const cnNums = '零一二三四五六七八九'
// Formal numerals (大写数字) for digits 1–9, including simplified and traditional variants
const formalNums: Record<string, number> = {
  壹: 1,
  贰: 2,
  貳: 2,
  叁: 3,
  參: 3,
  弎: 3,
  肆: 4,
  伍: 5,
  陆: 6,
  陸: 6,
  柒: 7,
  捌: 8,
  玖: 9,
}
const numMap: Record<string, number> = { ...formalNums }
for (let i = 0; i < cnNums.length; i++) {
  numMap[cnNums[i]] = i
}

// "两" / "兩" used informally for 2
numMap['两'] = 2
numMap['兩'] = 2

const numRegex = /^\d+$/

function isNumeric(val: string): boolean {
  return numRegex.test(val)
}

/**
 * Converts Chinese numbers to Arabic numbers.
 * Supports patterns like "一", "十二", "一百零五".
 */
export function chineseToNumber(text: string): number | null {
  if (!text) {
    return null
  }

  if (isNumeric(text)) {
    return Number.parseInt(text, 10)
  }

  let val = 0

  // Simple single digit check
  if (text.length === 1 && numMap[text] !== undefined) {
    return numMap[text]
  }

  // can't reuse regex with global flag
  const str = text.replace(/\s/g, '')

  // Check for "ten" cases like "十一" (11), "十" (10)
  if (str.startsWith('十')) {
    // "十" -> 10, "十三" -> 13
    if (str.length === 1) {
      return 10
    }
    // Treat leading "十" as 1 * 10
  }

  let section = 0 // accumulated value within a larger unit (like 万)
  let number = 0 // current digit
  let hasNumber = false

  for (const char of str) {
    if (numMap[char] !== undefined) {
      number = numMap[char]
      hasNumber = true
    } else if (unitMap[char] !== undefined) {
      const unit = unitMap[char]
      if (!hasNumber && unit === 10) {
        // Leading "十" or "零十"(invalid) - "十" means 10. Treat as 1*10
        number = 1
      }
      if (!hasNumber && unit !== 10) {
        return null
      }

      section += number * unit
      number = 0
      hasNumber = false

      // For larger units logic (万), simplistic here for Season/Episode counts is enough
      if (unit >= 10000) {
        val += section
        section = 0
      }
    } else if (char === '零') {
      continue
    } else {
      return null
    }
  }
  val += section + number

  return val
}
