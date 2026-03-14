import { Injectable, inject } from '@angular/core'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type {
  AudioTrack,
  SubtitleTrack,
} from '../../../core/video-player/video.service'
import {
  type ParsedStreams,
  parseFfmpegStreams,
  type StreamInfo,
} from '../util/parse-ffmpeg-streams'
import { FfmpegService } from './ffmpeg.service'

export type { ParsedStreams, StreamInfo }

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

  async listStreams(file: File): Promise<ParsedStreams> {
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
  ): Promise<ParsedStreams> {
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

    return parseFfmpegStreams(logs.join('\n'))
  }

  private getExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.')
    return dotIndex >= 0 ? name.slice(dotIndex) : ''
  }
}
