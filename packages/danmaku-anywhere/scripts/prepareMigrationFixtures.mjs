#!/usr/bin/env node

// Builds danmaku.zip, the migration danmaku fixture, from a real export: the
// smallest danmaku file per provider, renamed. backup.json.gz comes from
// e2e/fixture-gen instead, since it has to be written by v1.5.0 itself.
//
// Usage:
//   node scripts/prepareMigrationFixtures.mjs <export-root>

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'e2e',
  'fixtures',
  'migration'
)

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
  const [exportRoot] = process.argv.slice(2)
  if (!exportRoot) {
    console.error(
      'Usage: node scripts/prepareMigrationFixtures.mjs <export-root>'
    )
    process.exit(2)
  }
  await fs.mkdir(FIXTURES_DIR, { recursive: true })
  await writeDanmakuZip(exportRoot)
}

await main()
