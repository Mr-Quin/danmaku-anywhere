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

/**
 * Helper to write a file to FFmpeg FS and ensure it is deleted when disposed.
 */
async function writeFfmpegFile(
  ffmpeg: FFmpeg,
  name: string,
  data: Parameters<FFmpeg['writeFile']>[1]
): Promise<AsyncDisposable> {
  await ffmpeg.writeFile(name, data)
  return {
    async [Symbol.asyncDispose]() {
      try {
        await ffmpeg.deleteFile(name)
      } catch {
        // ignore cleanup errors
      }
    },
  }
}

@Injectable({ providedIn: 'root' })
export class MediaExtractorService {
  private readonly ffmpegService = inject(FfmpegService)

  private operationCounter = 0

  async listStreams(file: File): Promise<ParsedStreams> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const inputName = `input_${this.nextOpId()}${this.getExtension(file.name)}`

    await using stack = new AsyncDisposableStack()
    stack.use(await writeFfmpegFile(ffmpeg, inputName, await fetchFile(file)))

    return await this.probeStreams(ffmpeg, inputName)
  }

  async extractSubtitles(file: File): Promise<SubtitleTrack[]> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const opId = this.nextOpId()
    const inputName = `input_${opId}${this.getExtension(file.name)}`

    await using stack = new AsyncDisposableStack()
    stack.use(await writeFfmpegFile(ffmpeg, inputName, await fetchFile(file)))

    const { subtitles: streams } = await this.probeStreams(ffmpeg, inputName)
    if (streams.length === 0) {
      return []
    }

    const tracks: SubtitleTrack[] = []
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      const format = codecToSubtitleFormat(stream.codec)
      const outputName = `subtitle_${i}_${opId}.${format}`

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
      } catch {
        // Skip streams that fail to extract
      } finally {
        try {
          await ffmpeg.deleteFile(outputName)
        } catch {
          // ignore cleanup errors
        }
      }
    }

    return tracks
  }

  /**
   * Extract embedded audio tracks from a video file.
   * Returns audio tracks with blob URLs for each embedded audio stream.
   */
  async extractAudioTracks(file: File): Promise<AudioTrack[]> {
    const ffmpeg = await this.ffmpegService.getFFmpeg()
    const opId = this.nextOpId()
    const inputName = `input_${opId}${this.getExtension(file.name)}`

    await using stack = new AsyncDisposableStack()
    stack.use(await writeFfmpegFile(ffmpeg, inputName, await fetchFile(file)))

    const { audio: streams } = await this.probeStreams(ffmpeg, inputName)
    if (streams.length === 0) {
      return []
    }

    const tracks: AudioTrack[] = []
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      const outputName = `audio_${i}_${opId}.mp3`

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
      } catch {
        // Skip streams that fail to extract
      } finally {
        try {
          await ffmpeg.deleteFile(outputName)
        } catch {
          // ignore cleanup errors
        }
      }
    }

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

  private nextOpId(): number {
    return this.operationCounter++
  }

  private getExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.')
    return dotIndex >= 0 ? name.slice(dotIndex) : ''
  }
}
