// Dependency-free static server for the shared video test harness.
// Roots at e2e/fixtures so absolute paths like /media/x.webm and /sites/x.html
// resolve. Used for both agentic dev iteration and Playwright e2e.

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
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
  let pathname = decodeURIComponent(urlPath.split('?')[0])
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  const resolved = normalize(join(ROOT, pathname))
  if (!resolved.startsWith(ROOT)) {
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
  const start = match[1] ? Number(match[1]) : 0
  const end = match[2] ? Number(match[2]) : size - 1
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

function handle(req, res) {
  const filePath = resolvePath(req.url)
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
