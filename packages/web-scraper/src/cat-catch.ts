/**
 * Code adapted from https://github.com/xifangczy/cat-catch/
 */

export type ParsedHeaders = {
  size?: number
  type?: string
  attachment?: string
}

function ccGetResponseHeadersValue(headers?: chrome.webRequest.HttpHeader[]) {
  const header: ParsedHeaders = {}

  if (headers == undefined || headers.length == 0) {
    return header
  }

  for (const item of headers) {
    item.name = item.name.toLowerCase()
    if (!item.value) continue

    if (item.name == 'content-length') {
      header.size ??= Number.parseInt(item.value)
    } else if (item.name == 'content-type') {
      header.type = item.value.split(';')[0].toLowerCase()
    } else if (item.name == 'content-disposition') {
      header.attachment = item.value
    } else if (item.name == 'content-range') {
      const size = item.value.split('/')[1]
      if (size !== '*') {
        header.size = Number.parseInt(size)
      }
    }
  }
  return header
}

function ccFileNameParse(pathname: string) {
  const lastSegment = pathname.split('/').pop()
  if (!lastSegment) return [undefined, undefined] as const

  const fileName = decodeURI(lastSegment)
  const splitFileName = fileName.split('.')

  if (splitFileName.length == 1) return [fileName, undefined] as const

  const ext = splitFileName.pop()?.toLowerCase()

  return [fileName, ext] as const
}

const ccExtList = [
  { ext: 'flv', size: 0, state: true },
  { ext: 'hlv', size: 0, state: true },
  { ext: 'f4v', size: 0, state: true },
  { ext: 'mp4', size: 0, state: true },
  // { ext: 'mp3', size: 0, state: true },
  // { ext: 'wma', size: 0, state: true },
  // { ext: 'wav', size: 0, state: true },
  // { ext: 'm4a', size: 0, state: true },
  { ext: 'ts', size: 0, state: false },
  { ext: 'webm', size: 0, state: true },
  { ext: 'ogg', size: 0, state: true },
  { ext: 'ogv', size: 0, state: true },
  { ext: 'acc', size: 0, state: true },
  { ext: 'mov', size: 0, state: true },
  { ext: 'mkv', size: 0, state: true },
  { ext: 'm4s', size: 0, state: true },
  { ext: 'm3u8', size: 0, state: true },
  { ext: 'm3u', size: 0, state: true },
  { ext: 'mpeg', size: 0, state: true },
  { ext: 'avi', size: 0, state: true },
  { ext: 'wmv', size: 0, state: true },
  { ext: 'asf', size: 0, state: true },
  { ext: 'movie', size: 0, state: true },
  { ext: 'divx', size: 0, state: true },
  { ext: 'mpeg4', size: 0, state: true },
  { ext: 'vid', size: 0, state: true },
  { ext: 'aac', size: 0, state: true },
  { ext: 'mpd', size: 0, state: true },
  { ext: 'weba', size: 0, state: true },
  // { ext: 'opus', size: 0, state: true },
] as const

const ccExtMap = new Map<string, (typeof ccExtList)[number]>(
  ccExtList.map((item) => [item.ext, item])
)

const ccTypeList = [
  { type: 'audio/*', size: 0, state: true },
  { type: 'video/*', size: 0, state: true },
  { type: 'application/ogg', size: 0, state: true },
  { type: 'application/vnd.apple.mpegurl', size: 0, state: true },
  { type: 'application/x-mpegurl', size: 0, state: true },
  { type: 'application/mpegurl', size: 0, state: true },
  { type: 'application/octet-stream-m3u8', size: 0, state: true },
  { type: 'application/dash+xml', size: 0, state: true },
  { type: 'application/m4s', size: 0, state: true },
]

const ccTypeMap = new Map<string, (typeof ccTypeList)[number]>(
  ccTypeList.map((item) => [item.type, item])
)

type CheckStatus =
  | { status: 'accept'; type: string }
  | { status: 'break' }
  | { status: 'reject' }

function ccCheckExtension(ext: string, size?: number): CheckStatus {
  const Ext = ccExtMap.get(ext)
  if (!Ext) {
    return { status: 'reject' }
  }
  if (!Ext.state) {
    return { status: 'break' }
  }
  if (Ext.size != 0 && size != undefined && size <= Ext.size * 1024) {
    return { status: 'break' }
  }

  const getContentType = (ext: string) => {
    switch (ext) {
      case 'm3u8':
        return 'application/x-mpegurl'
      case 'mp4':
        return 'video/mp4'
      default:
        return `video/${ext}`
    }
  }

  return { status: 'accept', type: getContentType(Ext.ext) }
}

function ccCheckType(dataType: string, dataSize?: number): CheckStatus {
  const typeInfo =
    ccTypeMap.get(dataType.split('/')[0] + '/*') || ccTypeMap.get(dataType)

  if (!typeInfo) {
    return { status: 'reject' }
  }
  if (!typeInfo.state) {
    return { status: 'break' }
  }
  if (
    typeInfo.size != 0 &&
    dataSize != undefined &&
    dataSize <= typeInfo.size * 1024
  ) {
    return { status: 'break' }
  }
  return { status: 'accept', type: dataType }
}

const ccReFilename = /filename="?([^"]+)"?/

type VideoInfo = {
  src: string
  contentType: string
  type: 'video' | 'audio'
}

export const getVideoUrlFromResponse = (
  res: chrome.webRequest.WebResponseHeadersDetails
): VideoInfo | undefined => {
  const url = new URL(res.url)
  const [_, ext] = ccFileNameParse(url.pathname)

  const headers = ccGetResponseHeadersValue(res.responseHeaders)

  if (ext) {
    const check = ccCheckExtension(ext, headers.size)
    if (check.status === 'accept') {
      return {
        src: res.url,
        contentType: check.type,
        type: 'video',
      }
    }
    if (check.status === 'break') {
      return
    }
  }
  if (headers.type !== undefined) {
    const check = ccCheckType(headers.type, headers.size)
    if (check.status === 'accept') {
      return {
        src: res.url,
        contentType: check.type,
        type: 'video',
      }
    }
    if (check.status === 'break') {
      return
    }
  }
  if (headers.attachment !== undefined) {
    const match = headers.attachment.match(ccReFilename)
    if (match?.at(1)) {
      const [_, ext] = ccFileNameParse(decodeURIComponent(match[1]))
      if (ext) {
        const check = ccCheckExtension(ext, 0)
        if (check.status === 'accept') {
          return {
            src: res.url,
            contentType: check.type,
            type: 'video',
          }
        }
        if (check.status === 'break') {
          return
        }
      }
    }
  }
  if (res.type === 'media') {
    return {
      src: res.url,
      type: 'audio',
      contentType:
        res.responseHeaders?.find(
          (h) => h.name.toLowerCase() === 'content-type'
        )?.value || 'video/mp4',
    }
  }
}
