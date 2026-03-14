export const FFMPEG_LOGS_01 = `
[matroska,webm @ 0xdee8d0] Could not find codec parameters for stream 4 (Subtitle: hdmv_pgs_subtitle (pgssub)): unspecified size
Consider increasing the value for the 'analyzeduration' (0) and 'probesize' (5000000) options
Input #0, matroska,webm, from 'input.mkv':
  Metadata:
    encoder         : libebml v1.4.0 + libmatroska v1.6.0
    creation_time   : 2023-06-26T02:29:42.000000Z
  Duration: 00:23:42.05, start: 0.000000, bitrate: 4824 kb/s
  Chapters:
    Chapter #0:0: start 0.000000, end 71.989000
      Metadata:
        title           : Chapter 01
    Chapter #0:1: start 71.989000, end 162.037000
      Metadata:
        title           : Chapter 02
    Chapter #0:2: start 162.037000, end 620.036000
      Metadata:
        title           : Chapter 03
    Chapter #0:3: start 620.036000, end 1292.166000
      Metadata:
        title           : Chapter 04
    Chapter #0:4: start 1292.166000, end 1416.040000
      Metadata:
        title           : Chapter 05
    Chapter #0:5: start 1416.040000, end 1422.048000
      Metadata:
        title           : Chapter 06
  Stream #0:0: Video: hevc (Main 10), yuv420p10le(tv, bt709), 1920x1080, SAR 1:1 DAR 16:9, 23.98 fps, 23.98 tbr, 1k tbn (default)
    Metadata:
      BPS-eng         : 3064092
      DURATION-eng    : 00:23:42.046000000
      NUMBER_OF_FRAMES-eng: 34095
      NUMBER_OF_BYTES-eng: 544660127
      _STATISTICS_WRITING_APP-eng: mkvmerge v48.0.0 ('Fortress Around Your Heart') 64-bit
      _STATISTICS_WRITING_DATE_UTC-eng: 2023-06-26 02:29:42
      _STATISTICS_TAGS-eng: BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES
  Stream #0:1(jpn): Audio: flac, 48000 Hz, stereo, s32 (24 bit) (default)
    Metadata:
      title           : Main
      BPS-eng         : 1318452
      DURATION-eng    : 00:23:42.045000000
      NUMBER_OF_FRAMES-eng: 16665
      NUMBER_OF_BYTES-eng: 234362348
      _STATISTICS_WRITING_APP-eng: mkvmerge v48.0.0 ('Fortress Around Your Heart') 64-bit
      _STATISTICS_WRITING_DATE_UTC-eng: 2023-06-26 02:29:42
      _STATISTICS_TAGS-eng: BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES
  Stream #0:2(jpn): Audio: ac3, 48000 Hz, stereo, fltp, 192 kb/s
    Metadata:
      title           : Staff Commentary
      BPS-eng         : 192000
      DURATION-eng    : 00:23:42.048000000
      NUMBER_OF_FRAMES-eng: 44439
      NUMBER_OF_BYTES-eng: 34129152
      _STATISTICS_WRITING_APP-eng: mkvmerge v48.0.0 ('Fortress Around Your Heart') 64-bit
      _STATISTICS_WRITING_DATE_UTC-eng: 2023-06-26 02:29:42
      _STATISTICS_TAGS-eng: BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES
  Stream #0:3(jpn): Audio: ac3, 48000 Hz, stereo, fltp, 192 kb/s
    Metadata:
      title           : Onimai Talk
      BPS-eng         : 192000
      DURATION-eng    : 00:23:42.048000000
      NUMBER_OF_FRAMES-eng: 44439
      NUMBER_OF_BYTES-eng: 34129152
      _STATISTICS_WRITING_APP-eng: mkvmerge v48.0.0 ('Fortress Around Your Heart') 64-bit
      _STATISTICS_WRITING_DATE_UTC-eng: 2023-06-26 02:29:42
      _STATISTICS_TAGS-eng: BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES
  Stream #0:4(jpn): Subtitle: hdmv_pgs_subtitle
    Metadata:
      title           : Main
      BPS-eng         : 133621
      DURATION-eng    : 00:23:31.076000000
      NUMBER_OF_FRAMES-eng: 1719
      NUMBER_OF_BYTES-eng: 23568720
      _STATISTICS_WRITING_APP-eng: mkvmerge v48.0.0 ('Fortress Around Your Heart') 64-bit
      _STATISTICS_WRITING_DATE_UTC-eng: 2023-06-26 02:29:42
      _STATISTICS_TAGS-eng: BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES
At least one output file must be specified
Aborted()
`
