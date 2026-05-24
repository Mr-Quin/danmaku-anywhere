#!/usr/bin/env node

// Builds binary migration fixtures from a real export:
//   - backup.json.gz: chrome.storage backup, heavily redacted
//   - danmaku.zip:    one smallest danmaku file per provider, renamed
//
// Usage:
//   node scripts/prepareMigrationFixtures.mjs <backup.json> <export-root>

import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGzip } from 'node:zlib'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'e2e',
  'fixtures',
  'migration'
)

const REDACTED_URL = 'https://redacted.example'
const REDACTED_HOST_PATTERN = 'https://redacted.example/*'
const REDACTED_API_KEY = 'REDACTED_API_KEY'
const REDACTED_SECRET = 'REDACTED_SECRET'

// Hostnames whose URLs can stay verbatim. Anything else is redacted.
const PUBLIC_HOSTS = new Set([
  'api.dandanplay.net',
  'danmaku.weeblify.app',
  'api.openai.com',
  'localhost',
])

const SENSITIVE_HEADER_KEYS = new Set([
  'X-AppSecret',
  'X-AppId',
  'Authorization',
  'Cookie',
])

function isPublicUrl(url) {
  try {
    return PUBLIC_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

function redactUrl(url) {
  if (typeof url !== 'string') return url
  if (!/^https?:\/\//i.test(url)) return url
  return isPublicUrl(url) ? url : REDACTED_URL
}

function redactPattern(pattern) {
  if (typeof pattern !== 'string') return pattern
  if (!/^https?:/i.test(pattern)) return pattern
  // Match-pattern syntax includes * wildcards that break URL parsing.
  // Compare hostname literally.
  const hostMatch = pattern.match(/^https?:\/\/([^/]+)/i)
  if (!hostMatch) return REDACTED_HOST_PATTERN
  const host = hostMatch[1].replace(/^\*\./, '')
  return PUBLIC_HOSTS.has(host) ? pattern : REDACTED_HOST_PATTERN
}

function redactStringsDeep(node) {
  if (Array.isArray(node)) {
    return node.map(redactStringsDeep)
  }
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      if (k === 'patterns' && Array.isArray(v)) {
        out[k] = v.map(redactPattern)
      } else if (k === 'name' && typeof v === 'string' && /^https?:/i.test(v)) {
        out[k] = redactPattern(v)
      } else if (k === 'baseUrl' || /Url$/.test(k)) {
        out[k] = redactUrl(v)
      } else {
        out[k] = redactStringsDeep(v)
      }
    }
    return out
  }
  return node
}

function redactProviderConfig(providerConfig) {
  for (const p of providerConfig?.data ?? []) {
    for (const h of p?.options?.auth?.headers ?? []) {
      if (SENSITIVE_HEADER_KEYS.has(h?.key)) {
        h.value = REDACTED_SECRET
      }
    }
  }
}

function redactAiProviderConfig(aiProviderConfig) {
  for (const p of aiProviderConfig?.data ?? []) {
    if (p?.settings?.apiKey) {
      p.settings.apiKey = REDACTED_API_KEY
    }
  }
}

// Each service's migration chain runs the same regardless of row count.
// Extra rows are bloat and add leak surface.
function trimSection(section, keep) {
  if (Array.isArray(section?.data)) {
    section.data = section.data.slice(0, keep)
  }
}

function assertNoSecrets(serialized) {
  const danger = [
    /sk-[A-Za-z0-9_-]{20,}/, // OpenAI-style
    /AKIA[0-9A-Z]{16}/, // AWS
    /(\d{1,3}\.){3}\d{1,3}(?::\d+)?/, // any IPv4
  ]
  for (const pat of danger) {
    const m = serialized.match(pat)
    if (m) {
      const idx = serialized.indexOf(m[0])
      throw new Error(
        `Suspected secret in output near:\n  ${serialized.slice(Math.max(0, idx - 40), idx + 60)}`
      )
    }
  }
  const urls = serialized.match(/https?:\/\/[^"\s,*]+/g) ?? []
  for (const url of urls) {
    if (url.startsWith(REDACTED_URL)) continue
    if (isPublicUrl(url)) continue
    throw new Error(`Non-allowlisted URL leaked into fixture: ${url}`)
  }
}

async function writeBackup(srcPath) {
  let backup = JSON.parse(await fs.readFile(srcPath, 'utf8'))

  // Ordering matters: secret/header redactors target specific paths in
  // the original shape, then redactStringsDeep rewrites any remaining
  // URL-ish strings. Reversed, the deep walk would clobber the auth
  // headers before the keyed redactors find them.
  redactProviderConfig(backup?.services?.providerConfig)
  redactAiProviderConfig(backup?.services?.aiProviderConfig)
  if (backup?.services?.extensionOptions?.data?.id) {
    backup.services.extensionOptions.data.id =
      '00000000-0000-0000-0000-000000000001'
  }
  backup = redactStringsDeep(backup)

  trimSection(backup?.services?.mountConfig, 2)
  trimSection(backup?.services?.integrationPolicy, 1)
  trimSection(backup?.services?.localMatchingRule, 0)

  const serialized = JSON.stringify(backup, null, 2)
  assertNoSecrets(serialized)
  const outPath = path.join(FIXTURES_DIR, 'backup.json.gz')
  await pipeline(
    async function* () {
      yield Buffer.from(serialized, 'utf8')
    },
    createGzip(),
    createWriteStream(outPath)
  )
  console.log(`Wrote ${outPath}`)
}

async function pickDanmakuFiles(exportRoot) {
  const providers = (await fs.readdir(exportRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
  const picks = []
  for (const provider of providers) {
    const providerDir = path.join(exportRoot, provider.name)
    const candidates = await collectDanmakuFiles(providerDir)
    if (candidates.length === 0) continue
    const sized = await Promise.all(
      candidates.map(async (file) => ({
        file,
        size: (await fs.stat(file)).size,
      }))
    )
    sized.sort((a, b) => a.size - b.size)
    picks.push({ provider: provider.name, file: sized[0].file })
  }
  return picks
}

async function collectDanmakuFiles(dir) {
  const out = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await collectDanmakuFiles(full)))
    } else if (/\.(json|xml)$/i.test(e.name)) {
      out.push(full)
    }
  }
  return out
}

// Original filenames leak the user's watch history. Rename to generic.
function entryNameFor(providerDirName, fileName, index) {
  const provider = providerDirName.match(/^([^ ]+)/)?.[1] ?? `provider${index}`
  const ext = fileName.match(/\.[^.]+$/)?.[0] ?? '.json'
  return `${provider.toLowerCase()}/${index}${ext}`
}

async function writeDanmakuZip(exportRoot) {
  const picks = await pickDanmakuFiles(exportRoot)
  if (picks.length === 0) {
    throw new Error(`No danmaku files found under ${exportRoot}`)
  }
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const [i, { provider, file }] of picks.entries()) {
    const buf = await fs.readFile(file)
    const entryName = entryNameFor(provider, path.basename(file), i)
    zip.file(entryName, buf)
    console.log(`  added ${entryName} (${buf.length} bytes)`)
  }
  const out = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  const outPath = path.join(FIXTURES_DIR, 'danmaku.zip')
  await fs.writeFile(outPath, out)
  console.log(`Wrote ${outPath} (${out.length} bytes)`)
}

async function main() {
  const [backupSrc, exportRoot] = process.argv.slice(2)
  if (!backupSrc || !exportRoot) {
    console.error(
      'Usage: node scripts/prepareMigrationFixtures.mjs <backup.json> <export-root>'
    )
    process.exit(2)
  }
  await fs.mkdir(FIXTURES_DIR, { recursive: true })
  await writeBackup(backupSrc)
  await writeDanmakuZip(exportRoot)
}

await main()
