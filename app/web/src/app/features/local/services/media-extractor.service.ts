import { Injectable, inject } from '@angular/core'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type {
  AudioTrack,
  SubtitleTrack,
} from '../../../core/video-player/video.service'
import { FfmpegService } from './ffmpeg.service'

interface StreamInfo {
  index: number
  language: string
  title: string
  codec: string
}

export interface SubtitleStreamInfo extends StreamInfo {}
export interface AudioStreamInfo extends StreamInfo {}

export interface MediaStreams {
  subtitles: SubtitleStreamInfo[]
  audio: AudioStreamInfo[]
}

function codecToSubtitleFormat(codec: string): 'ass' | 'srt' | 'vtt' {
  if (codec.includes('ass') || codec.includes('ssa')) {
    return 'ass'
  }
  if (codec.includes('webvtt')) {
    return 'vtt'
  }
  return 'srt'
}

@Injectable({ providedIn: 'root' })
export class MediaExtractorService {
  private readonly ffmpegService = inject(FfmpegService)

  async listStreams(file: File): Promise<MediaStreams> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const inputName = 'input' + this.getExtension(file.name)

    await ffmpeg.writeFile(inputName, await fetchFile(file))

    try {
      return await this.probeStreams(ffmpeg, inputName)
    } finally {
      await ffmpeg.deleteFile(inputName)
    }
  }

  async extractSubtitles(file: File): Promise<SubtitleTrack[]> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const inputName = 'input' + this.getExtension(file.name)

    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const { subtitles: streams } = await this.probeStreams(ffmpeg, inputName)
    if (streams.length === 0) {
      await ffmpeg.deleteFile(inputName)
      return []
    }

    const tracks: SubtitleTrack[] = []
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      const format = codecToSubtitleFormat(stream.codec)
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

  /**
   * Extract embedded audio tracks from a video file.
   * Returns audio tracks with blob URLs for each embedded audio stream.
   */
  async extractAudioTracks(file: File): Promise<AudioTrack[]> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const inputName = 'input' + this.getExtension(file.name)

    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const { audio: streams } = await this.probeStreams(ffmpeg, inputName)
    if (streams.length === 0) {
      await ffmpeg.deleteFile(inputName)
      return []
    }

    const tracks: AudioTrack[] = []
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      const outputName = `audio_${i}.mp3`

      try {
        await ffmpeg.exec([
          '-i',
          inputName,
          '-map',
          `0:${stream.index}`,
          '-c:a',
          'libmp3lame',
          outputName,
        ])

        const data = await ffmpeg.readFile(outputName)
        const blob = new Blob(
          [data instanceof Uint8Array ? data.slice() : data],
          { type: 'audio/mpeg' }
        )
        const url = URL.createObjectURL(blob)

        const name =
          stream.title ||
          (stream.language !== 'und' ? stream.language : '') ||
          `音轨 ${i + 1}`
        tracks.push({
          name,
          url,
          codec: stream.codec,
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

  private async probeStreams(
    ffmpeg: FFmpeg,
    inputName: string
  ): Promise<MediaStreams> {
    const subtitles: SubtitleStreamInfo[] = []
    const audio: AudioStreamInfo[] = []
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

    const fullLog = logs.join('\n')

    // Parse subtitle streams: Stream #0:N(lang): Subtitle: codec_name
    const subtitleRegex = /Stream #0:(\d+)(?:\(([^)]*)\))?: Subtitle: (\w+)/g
    let match: RegExpExecArray | null
    while ((match = subtitleRegex.exec(fullLog)) !== null) {
      subtitles.push({
        index: Number.parseInt(match[1], 10),
        language: match[2] || 'und',
        codec: match[3],
        title: '',
      })
    }

    // Parse audio streams: Stream #0:N(lang): Audio: codec_name
    const audioRegex = /Stream #0:(\d+)(?:\(([^)]*)\))?: Audio: (\w+)/g
    while ((match = audioRegex.exec(fullLog)) !== null) {
      audio.push({
        index: Number.parseInt(match[1], 10),
        language: match[2] || 'und',
        codec: match[3],
        title: '',
      })
    }

    // Try to find title metadata for each stream
    for (const stream of [...subtitles, ...audio]) {
      const titleRegex = new RegExp(
        `Stream #0:${stream.index}[^]*?title\\s*:\\s*(.+)`,
        'm'
      )
      const titleMatch = titleRegex.exec(fullLog)
      if (titleMatch) {
        stream.title = titleMatch[1].trim()
      }
    }

    return { subtitles, audio }
  }

  private getExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.')
    return dotIndex >= 0 ? name.slice(dotIndex) : ''
  }
}
