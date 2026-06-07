// Dependency-free static server for the shared video test harness.
// Roots at e2e/fixtures so absolute paths like /media/x.webm and /sites/x.html
// resolve. Used for both agentic dev iteration and Playwright e2e.

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../fixtures', import.meta.url))

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
}

function parsePort() {
  const flagIndex = process.argv.indexOf('--port')
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    return Number(process.argv[flagIndex + 1])
  }
  if (process.env.PORT) {
    return Number(process.env.PORT)
  }
  return 8889
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath)] || 'application/octet-stream'
}

function resolvePath(urlPath) {
  let pathname
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0])
  } catch {
    return null
  }
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  const resolved = normalize(join(ROOT, pathname))
  if (resolved !== ROOT && !resolved.startsWith(ROOT + sep)) {
    return null
  }
  return resolved
}

function sendRange(req, res, filePath, size, type) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
  if (!match) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` })
    res.end()
    return
  }
  let start
  let end
  if (match[1] === '') {
    // Suffix range, e.g. "bytes=-500" means the last 500 bytes.
    start = Math.max(0, size - Number(match[2]))
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : size - 1
  }
  if (start > end || end >= size) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` })
    res.end()
    return
  }
  res.writeHead(206, {
    'Content-Type': type,
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
  })
  createReadStream(filePath, { start, end }).pipe(res)
}

// Media served under this prefix rejects the crossorigin clone's CORS request
// (it carries an Origin header) so the occlusion DNR ACAO rule can't rescue it,
// while the plain <video> request (no Origin) still plays and taints.
const CORS_FAIL_PREFIX = '/cors-fail/'

function handle(req, res) {
  let urlPath = req.url
  if (urlPath.startsWith(CORS_FAIL_PREFIX)) {
    if (req.headers.origin) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    urlPath = `/${urlPath.slice(CORS_FAIL_PREFIX.length)}`
  }
  const filePath = resolvePath(urlPath)
  if (!filePath) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  let stat
  try {
    stat = statSync(filePath)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
    return
  }
  if (stat.isDirectory()) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }
  const type = contentTypeFor(filePath)
  if (req.headers.range) {
    sendRange(req, res, filePath, stat.size, type)
    return
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Content-Length': stat.size,
  })
  createReadStream(filePath).pipe(res)
}

const port = parsePort()
createServer(handle).listen(port, () => {
  console.log(`DA harness serving ${ROOT} at http://localhost:${port}/`)
})
