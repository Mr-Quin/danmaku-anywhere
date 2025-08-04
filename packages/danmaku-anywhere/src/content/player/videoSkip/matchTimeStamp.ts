export interface TimestampMatch {
  minutes: number
  seconds: number
  targetTime: number
  timestamp: string
}

const timestampRegex = /(空降|跳伞|跳傘)\D*(\d+)[:：](\d{1,2})/

export function matchTimeStamp(text: string): TimestampMatch | null {
  const match = timestampRegex.exec(text)

  if (!match) {
    return null
  }

  const minute = match[2] // Second capture group (minutes)
  const second = match[3] // Third capture group (seconds)

  return parseTimestamp(minute, second)
}

function parseTimestamp(
  minutesStr: string,
  secondsStr: string
): TimestampMatch | null {
  const minutes = Number.parseInt(minutesStr, 10)
  const seconds = Number.parseInt(secondsStr, 10)

  // validate time
  if (
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    seconds >= 60 ||
    minutes < 0 ||
    seconds < 0
  ) {
    return null
  }

  const targetTime = minutes * 60 + seconds
  const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return {
    minutes,
    seconds,
    targetTime,
    timestamp,
  }
}
