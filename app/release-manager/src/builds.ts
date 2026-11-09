import type { Channel, PublicState, ReleaseAsset } from './types.js'

export type BuildKind =
  | 'stable'
  | 'nightly'
  | 'pr'
  | 'manual'
  | 'branch'
  | 'other'

export interface Build {
  tag: string
  version: string
  kind: BuildKind
  title: string
  publishedAt?: string
  downloadedAt?: string
  notes: string[]
  installed: boolean
  active: boolean
}

export const KIND_LABEL: Record<BuildKind, string> = {
  stable: 'Stable',
  nightly: 'Nightly',
  pr: 'PR preview',
  manual: 'Manual build',
  branch: 'Branch preview',
  other: 'Preview',
}

function buildNumber(version: string): string {
  const parts = version.split('.')
  return parts[parts.length - 1]
}

// Nightly tags are CI run ids, so name builds by the version's last segment.
function describe(
  tag: string,
  version: string,
  channel: Channel
): { kind: BuildKind; title: string } {
  if (channel === 'stable') {
    return { kind: 'stable', title: tag }
  }
  if (tag.startsWith('nightly-')) {
    return { kind: 'nightly', title: `Nightly #${buildNumber(version)}` }
  }
  if (tag.startsWith('preview-pr-')) {
    return { kind: 'pr', title: `PR #${tag.slice('preview-pr-'.length)}` }
  }
  if (tag.startsWith('preview-manual-')) {
    return { kind: 'manual', title: `Manual build #${buildNumber(version)}` }
  }
  if (tag.startsWith('preview-branch-')) {
    return {
      kind: 'branch',
      title: `Branch ${tag.slice('preview-branch-'.length)}`,
    }
  }
  return { kind: 'other', title: tag }
}

export function toBuilds(
  releases: ReleaseAsset[],
  state: PublicState
): Build[] {
  const cached = new Map(state.builds.map((b) => [b.tag, b]))
  const listed = new Set(releases.map((r) => r.tag))
  const onlyCached = state.builds.filter((b) => !listed.has(b.tag))

  const builds: Build[] = [
    ...releases.map((r) => ({
      ...describe(r.tag, r.version, r.channel),
      tag: r.tag,
      version: r.version,
      publishedAt: r.publishedAt,
      downloadedAt: cached.get(r.tag)?.downloadedAt,
      notes: r.notes,
      installed: cached.has(r.tag),
      active: state.activeTag === r.tag,
    })),
    ...onlyCached.map((b) => ({
      ...describe(b.tag, b.version, b.channel),
      tag: b.tag,
      version: b.version,
      downloadedAt: b.downloadedAt,
      notes: [],
      installed: true,
      active: state.activeTag === b.tag,
    })),
  ]
  return builds.sort((a, b) => {
    return sortDate(b).localeCompare(sortDate(a))
  })
}

function sortDate(build: Build): string {
  return build.publishedAt ?? build.downloadedAt ?? ''
}

export function matchesQuery(build: Build, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return [build.title, build.tag, build.version, ...build.notes].some((s) =>
    s.toLowerCase().includes(needle)
  )
}
