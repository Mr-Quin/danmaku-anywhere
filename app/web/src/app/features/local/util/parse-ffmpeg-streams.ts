export interface StreamInfo {
  index: number
  language: string
  title: string
  codec: string
}

export interface ParsedStreams {
  subtitles: StreamInfo[]
  audio: StreamInfo[]
}

/**
 * Parse FFmpeg log output to extract subtitle and audio stream information.
 *
 * Expects the log produced by `ffmpeg -i <file> -hide_banner`.
 * Stream lines follow the pattern:
 *   Stream #0:N(lang): Audio|Subtitle: codec_name
 *
 * Title metadata is extracted from the lines following each stream header.
 */
export function parseFfmpegStreams(log: string): ParsedStreams {
  const subtitles: StreamInfo[] = []
  const audio: StreamInfo[] = []

  const subtitleRegex = /Stream #0:(\d+)(?:\(([^)]*)\))?: Subtitle: (\w+)/g
  let match: RegExpExecArray | null
  while ((match = subtitleRegex.exec(log)) !== null) {
    subtitles.push({
      index: Number.parseInt(match[1], 10),
      language: match[2] || 'und',
      codec: match[3],
      title: '',
    })
  }

  const audioRegex = /Stream #0:(\d+)(?:\(([^)]*)\))?: Audio: (\w+)/g
  while ((match = audioRegex.exec(log)) !== null) {
    audio.push({
      index: Number.parseInt(match[1], 10),
      language: match[2] || 'und',
      codec: match[3],
      title: '',
    })
  }

  // Try to find title metadata for each stream.
  // Title appears in indented metadata lines after the stream header.
  // Use a negative lookahead to avoid crossing into the next stream's block,
  // and \b to avoid matching "title" inside "Subtitle".
  for (const stream of [...subtitles, ...audio]) {
    const titleRegex = new RegExp(
      `Stream #0:${stream.index}(?=[:(])(?:(?!Stream #0:)[\\s\\S])*?\\btitle\\s*:\\s*(.+)`,
      'm'
    )
    const titleMatch = titleRegex.exec(log)
    if (titleMatch) {
      stream.title = titleMatch[1].trim()
    }
  }

  return { subtitles, audio }
}
