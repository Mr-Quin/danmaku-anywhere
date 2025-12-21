#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

interface Release {
  tag_name: string
  published_at: string
  body: string
  draft: boolean
  prerelease: boolean
}

async function fetchReleases(repository: string): Promise<Release[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases`
  )

  if (!response.ok) {
    throw new Error(
      `Failed to fetch releases: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

function processReleases(releases: Release[]): Release[] {
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
}

function escapeHtmlChars(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function transformGitHubLinks(content: string, repository: string): string {
  return content.replace(
    /#(\d+)/g,
    `[#$1](https://github.com/${repository}/pull/$1)`
  )
}

function generateChangelogContent(
  releases: Release[],
  repository: string
): string {
  let content = `---
title: 更新日志
description: 更新日志
---

`

  releases.forEach((release) => {
    const date = new Date(release.published_at).toISOString().split('T')[0]
    const version = release.tag_name
    const escapedBody = escapeHtmlChars(release.body)
    const body = transformGitHubLinks(escapedBody, repository)
    content += `## ${version} - ${date}\n\n`
    content += `${body}\n\n`
  })

  return content
}

function writeChangelogFile(content: string, filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, content, 'utf8')
}

async function syncChangelog(
  repository: string,
  outputPath: string
): Promise<void> {
  try {
    console.log(`Fetching releases from ${repository}...`)
    const releases = await fetchReleases(repository)

    console.log(`Processing ${releases.length} releases...`)
    const publishedReleases = processReleases(releases)

    console.log(`Found ${publishedReleases.length} published releases`)

    if (publishedReleases.length === 0) {
      console.log('No published releases found, skipping changelog generation')
      return
    }

    console.log('Generating changelog content...')
    const changelogContent = generateChangelogContent(
      publishedReleases,
      repository
    )

    console.log(`Writing changelog to ${outputPath}...`)
    writeChangelogFile(changelogContent, outputPath)

    console.log('✅ Changelog sync completed successfully!')
  } catch (error) {
    console.error(
      '❌ Error syncing changelog:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

export {
  fetchReleases,
  processReleases,
  escapeHtmlChars,
  transformGitHubLinks,
  generateChangelogContent,
  writeChangelogFile,
  syncChangelog,
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repository = process.argv[2]
  const outputPath = process.argv[3]

  if (!repository || !outputPath) {
    console.error(
      'Usage: node --experimental-strip-types sync-changelog.ts <repository> <output-path>'
    )
    console.error(
      'Example: node --experimental-strip-types sync-changelog.ts Mr-Quin/danmaku-anywhere docs/src/content/docs/change-log.mdx'
    )
    process.exit(1)
  }

  syncChangelog(repository, outputPath).catch((error) => {
    console.error(
      'Script failed:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  })
}
