import { Injectable } from '@angular/core'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { SubtitleTrack } from '../../../core/video-player/video.service'

interface SubtitleStreamInfo {
  index: number
  language: string
  title: string
  codec: string
}

/** Maps FFmpeg subtitle codec names to output format extensions */
function codecToFormat(codec: string): 'ass' | 'srt' | 'vtt' {
  if (codec.includes('ass') || codec.includes('ssa')) return 'ass'
  if (codec.includes('webvtt')) return 'vtt'
  return 'srt'
}

@Injectable({ providedIn: 'root' })
export class SubtitleExtractorService {
  private ffmpeg: FFmpeg | null = null
  private loading: Promise<FFmpeg> | null = null

  private async getFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg
    if (this.loading) return this.loading

    this.loading = this.initFFmpeg()
    try {
      this.ffmpeg = await this.loading
      return this.ffmpeg
    } finally {
      this.loading = null
    }
  }

  private async initFFmpeg(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg()
    const base = 'ffmpeg'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    return ffmpeg
  }

  /**
   * Extract embedded subtitle tracks from a video file.
   * Returns subtitle tracks with blob URLs for each embedded subtitle stream.
   */
  async extractSubtitles(file: File): Promise<SubtitleTrack[]> {
    const ffmpeg = await this.getFFmpeg()
    const inputName = 'input' + this.getExtension(file.name)

    // Write input file to FFmpeg virtual filesystem
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // Probe for subtitle streams
    const streams = await this.probeSubtitleStreams(ffmpeg, inputName)
    if (streams.length === 0) {
      await ffmpeg.deleteFile(inputName)
      return []
    }

    // Extract each subtitle stream
    const tracks: SubtitleTrack[] = []
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      const format = codecToFormat(stream.codec)
      const outputName = `subtitle_${i}.${format}`

      try {
        await ffmpeg.exec([
          '-i',
          inputName,
          '-map',
          `0:${stream.index}`,
          '-c:s',
          format === 'ass' ? 'ass' : format === 'vtt' ? 'webvtt' : 'srt',
          outputName,
        ])

        const data = await ffmpeg.readFile(outputName)
        const blob = new Blob(
          [data instanceof Uint8Array ? data.slice() : data],
          { type: 'text/plain' }
        )
        const url = URL.createObjectURL(blob)

        const name =
          stream.title ||
          (stream.language !== 'und' ? stream.language : '') ||
          `字幕 ${i + 1}`
        tracks.push({
          name,
          url,
          type: format,
          source: 'embedded',
        })

        await ffmpeg.deleteFile(outputName)
      } catch {
        // Skip streams that fail to extract
      }
    }

    await ffmpeg.deleteFile(inputName)
    return tracks
  }

  private async probeSubtitleStreams(
    ffmpeg: FFmpeg,
    inputName: string
  ): Promise<SubtitleStreamInfo[]> {
    const streams: SubtitleStreamInfo[] = []
    const logs: string[] = []

    const logHandler = ({ message }: { message: string }) => {
      logs.push(message)
    }
    ffmpeg.on('log', logHandler)

    try {
      // Run ffmpeg with no output to get stream info from logs
      await ffmpeg.exec(['-i', inputName, '-hide_banner'])
    } catch {
      // ffmpeg exits with error when no output specified, but logs are captured
    }

    ffmpeg.off('log', logHandler)

    // Parse logs to find subtitle streams
    // Format: Stream #0:N(lang): Subtitle: codec_name
    //   or: Stream #0:N: Subtitle: codec_name
    const streamRegex = /Stream #0:(\d+)(?:\(([^)]*)\))?: Subtitle: (\w+)/g

    const fullLog = logs.join('\n')
    let match: RegExpExecArray | null
    while ((match = streamRegex.exec(fullLog)) !== null) {
      const index = Number.parseInt(match[1], 10)
      const language = match[2] || 'und'
      const codec = match[3]
      streams.push({ index, language, title: '', codec })
    }

    // Try to find title metadata for each stream
    for (const stream of streams) {
      const titleRegex = new RegExp(
        `Stream #0:${stream.index}[^]*?title\\s*:\\s*(.+)`,
        'm'
      )
      const titleMatch = titleRegex.exec(fullLog)
      if (titleMatch) {
        stream.title = titleMatch[1].trim()
      }
    }

    return streams
  }

  private getExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.')
    return dotIndex >= 0 ? name.slice(dotIndex) : ''
  }
}
