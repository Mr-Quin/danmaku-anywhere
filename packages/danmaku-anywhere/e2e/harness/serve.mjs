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

// The crossorigin clone is the only request in CORS mode; the plain <video>
// request is `no-cors`. Each prefix rejects or delays that one request in a
// different way so the occlusion recovery paths can be exercised end to end,
// while the plain <video> still plays and taints.
//
// cors-fail:    rejected outright, nothing can rescue it.
// origin-block: rejected only when it carries an Origin header, the way a
//               hotlink-protected CDN does.
// flaky-clone:  rejected once, then served, so a retry has something to find.
// slow-clone:   served, but slowly enough to outlast a short readiness budget.
const CORS_FAIL_PREFIX = '/cors-fail/'
const ORIGIN_BLOCK_PREFIX = '/origin-block/'
const FLAKY_CLONE_PREFIX = '/flaky-clone/'
const SLOW_CLONE_PREFIX = '/slow-clone/'
const SLOW_CLONE_DELAY_MS = 10_000

const flakyRejected = new Set()

function isCloneRequest(req) {
  return req.headers['sec-fetch-mode'] === 'cors'
}

function reject(res, status) {
  res.writeHead(status)
  res.end('Rejected')
}

function handle(req, res) {
  let urlPath = req.url
  if (urlPath.startsWith(CORS_FAIL_PREFIX)) {
    if (isCloneRequest(req)) {
      reject(res, 403)
      return
    }
    urlPath = `/${urlPath.slice(CORS_FAIL_PREFIX.length)}`
  }
  if (urlPath.startsWith(ORIGIN_BLOCK_PREFIX)) {
    if (req.headers.origin) {
      reject(res, 403)
      return
    }
    urlPath = `/${urlPath.slice(ORIGIN_BLOCK_PREFIX.length)}`
  }
  if (urlPath.startsWith(FLAKY_CLONE_PREFIX)) {
    urlPath = `/${urlPath.slice(FLAKY_CLONE_PREFIX.length)}`
    if (isCloneRequest(req) && !flakyRejected.has(urlPath)) {
      flakyRejected.add(urlPath)
      reject(res, 503)
      return
    }
  }
  if (urlPath.startsWith(SLOW_CLONE_PREFIX)) {
    urlPath = `/${urlPath.slice(SLOW_CLONE_PREFIX.length)}`
    if (isCloneRequest(req)) {
      const path = urlPath
      setTimeout(() => serveFile(req, res, path), SLOW_CLONE_DELAY_MS)
      return
    }
  }
  serveFile(req, res, urlPath)
}

function serveFile(req, res, urlPath) {
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
