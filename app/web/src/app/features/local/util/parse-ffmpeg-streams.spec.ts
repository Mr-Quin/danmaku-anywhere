import { FFMPEG_LOGS_01 } from './__fixture__/ffmpeg-logs-01'
import { FFMPEG_LOGS_02 } from './__fixture__/ffmpeg-logs-02'
import { parseFfmpegStreams } from './parse-ffmpeg-streams'

describe('parseFfmpegStreams', () => {
  describe('fixture 01 – multiple audio + PGS subtitle', () => {
    const result = parseFfmpegStreams(FFMPEG_LOGS_01)

    it('should parse audio streams', () => {
      expect(result.audio.length).toBe(3)

      expect(result.audio[0]).toEqual({
        index: 1,
        language: 'jpn',
        codec: 'flac',
        title: 'Main',
      })

      expect(result.audio[1]).toEqual({
        index: 2,
        language: 'jpn',
        codec: 'ac3',
        title: 'Staff Commentary',
      })

      expect(result.audio[2]).toEqual({
        index: 3,
        language: 'jpn',
        codec: 'ac3',
        title: 'Onimai Talk',
      })
    })

    it('should parse subtitle streams', () => {
      expect(result.subtitles.length).toBe(1)

      expect(result.subtitles[0]).toEqual({
        index: 4,
        language: 'jpn',
        codec: 'hdmv_pgs_subtitle',
        title: 'Main',
      })
    })
  })

  describe('fixture 02 – ASS subtitles with attachments', () => {
    const result = parseFfmpegStreams(FFMPEG_LOGS_02)

    it('should parse audio streams', () => {
      expect(result.audio.length).toBe(1)

      expect(result.audio[0]).toEqual({
        index: 1,
        language: 'jpn',
        codec: 'aac',
        title: '',
      })
    })

    it('should parse subtitle streams', () => {
      expect(result.subtitles.length).toBe(2)

      expect(result.subtitles[0]).toEqual({
        index: 2,
        language: 'chi',
        codec: 'ass',
        title: '简日双语',
      })

      expect(result.subtitles[1]).toEqual({
        index: 3,
        language: 'chi',
        codec: 'ass',
        title: '繁日雙語',
      })
    })

    it('should not include attachment streams', () => {
      const allIndices = [
        ...result.audio.map((s) => s.index),
        ...result.subtitles.map((s) => s.index),
      ]
      for (let i = 4; i <= 5; i++) {
        expect(allIndices).not.toContain(i)
      }
    })
  })

  describe('edge cases', () => {
    it('should return empty arrays for empty input', () => {
      const result = parseFfmpegStreams('')
      expect(result.subtitles).toEqual([])
      expect(result.audio).toEqual([])
    })

    it('should handle streams without language tag', () => {
      const log = '  Stream #0:1: Audio: aac, 48000 Hz, stereo'
      const result = parseFfmpegStreams(log)
      expect(result.audio.length).toBe(1)
      expect(result.audio[0].language).toBe('und')
    })

    it('should handle streams without title metadata', () => {
      const log = '  Stream #0:2(eng): Subtitle: srt'
      const result = parseFfmpegStreams(log)
      expect(result.subtitles.length).toBe(1)
      expect(result.subtitles[0].title).toBe('')
      expect(result.subtitles[0].language).toBe('eng')
    })
  })
})
