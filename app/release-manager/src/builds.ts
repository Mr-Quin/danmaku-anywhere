import type { CachedBuild, PublicState, ReleaseAsset } from './types.js'

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

function kindOf(release: ReleaseAsset | CachedBuild): BuildKind {
  if (release.channel === 'stable') {
    return 'stable'
  }
  const subtype =
    'previewSubtype' in release ? release.previewSubtype : undefined
  if (subtype === 'nightly' || release.tag.startsWith('nightly-')) {
    return 'nightly'
  }
  if (subtype === 'pr' || release.tag.startsWith('preview-pr-')) {
    return 'pr'
  }
  if (subtype === 'manual' || release.tag.startsWith('preview-manual-')) {
    return 'manual'
  }
  if (subtype === 'branch' || release.tag.startsWith('preview-branch-')) {
    return 'branch'
  }
  return 'other'
}

function buildNumber(version: string): string {
  const parts = version.split('.')
  return parts[parts.length - 1]
}

// Nightly tags are CI run ids, so name previews by the build number in the version.
export function buildTitle(
  tag: string,
  version: string,
  kind: BuildKind
): string {
  switch (kind) {
    case 'nightly':
      return `Nightly #${buildNumber(version)}`
    case 'pr':
      return `PR #${tag.replace('preview-pr-', '')}`
    case 'manual':
      return `Manual build #${buildNumber(version)}`
    case 'branch':
      return `Branch ${tag.replace('preview-branch-', '')}`
    default:
      return tag
  }
}

export function toBuilds(
  releases: ReleaseAsset[],
  state: PublicState
): Build[] {
  const cached = new Map(state.builds.map((b) => [b.tag, b]))
  const fromReleases = releases.map((r) => {
    const kind = kindOf(r)
    return {
      tag: r.tag,
      version: r.version,
      kind,
      title: buildTitle(r.tag, r.version, kind),
      publishedAt: r.publishedAt,
      downloadedAt: cached.get(r.tag)?.downloadedAt,
      notes: r.notes,
      installed: cached.has(r.tag),
      active: state.activeTag === r.tag,
    }
  })
  const listed = new Set(releases.map((r) => r.tag))
  const onlyCached = state.builds
    .filter((b) => !listed.has(b.tag))
    .map((b) => {
      const kind = kindOf(b)
      return {
        tag: b.tag,
        version: b.version,
        kind,
        title: buildTitle(b.tag, b.version, kind),
        downloadedAt: b.downloadedAt,
        notes: [],
        installed: true,
        active: state.activeTag === b.tag,
      }
    })
  return [...fromReleases, ...onlyCached].sort((a, b) => {
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
