const fs = require('node:fs')
const path = require('node:path')

const MARKER = '<!-- danmaku-anywhere:e2e-comment -->'
const STATUS_EMOJI = {
  passed: '✅',
  failed: '❌',
  timedOut: '⏱️',
  interrupted: '⛔',
  skipped: '⏭️',
  flaky: '⚠️',
}
const MAX_FAILURES_LISTED = 25

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '-'
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }
  const rounded = Math.round(totalSeconds)
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return `${minutes}m ${seconds}s`
}

function readReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return null
  }
  try {
    const raw = fs.readFileSync(reportPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.warn(
      `Failed to parse e2e report at ${reportPath}: ${error.message}`
    )
    return null
  }
}

function collectSpecs(report) {
  const specs = []
  function walk(suite, ancestry) {
    const fileLabel = suite.file ? path.basename(suite.file) : suite.title
    const trail = ancestry.length === 0 ? [fileLabel] : ancestry
    for (const spec of suite.specs ?? []) {
      const title = [...trail, spec.title].join(' › ')
      const test = spec.tests?.[0]
      const result = test?.results?.[test.results.length - 1]
      // Playwright aggregates per-test status as 'expected' | 'unexpected' |
      // 'skipped' | 'flaky' on the test object; results[].status is the raw
      // attempt outcome. Trust test.status for skipped/flaky so we don't
      // miscount tests where results[] is empty (e.g. test.skip()).
      const aggregated = test?.status
      const lastResultStatus = result?.status
      const status =
        aggregated === 'skipped' || aggregated === 'flaky'
          ? aggregated
          : (lastResultStatus ?? (spec.ok ? 'passed' : 'failed'))
      specs.push({
        title,
        file: spec.file ?? suite.file ?? '',
        ok: spec.ok !== false,
        status,
        duration: result?.duration ?? 0,
      })
    }
    for (const child of suite.suites ?? []) {
      walk(child, [...trail, child.title])
    }
  }
  for (const suite of report.suites ?? []) {
    walk(suite, [])
  }
  return specs
}

function summarize(report) {
  const specs = collectSpecs(report)
  const counts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    total: specs.length,
  }
  const failures = []
  for (const spec of specs) {
    if (spec.status === 'skipped') {
      counts.skipped += 1
      continue
    }
    if (spec.status === 'flaky') {
      counts.flaky += 1
      continue
    }
    if (spec.ok) {
      counts.passed += 1
      continue
    }
    counts.failed += 1
    failures.push(spec)
  }
  const stats = report.stats ?? {}
  const duration = Number.isFinite(stats.duration) ? stats.duration : 0
  return { counts, failures, duration }
}

function buildBody({ summary, runUrl, runNumber, reportUrl, sha }) {
  const { counts, failures, duration } = summary
  const passed = counts.failed === 0 && counts.total > 0
  const heading = passed
    ? '### ✅ E2E tests passed'
    : counts.total === 0
      ? '### ⚠️ E2E tests did not produce a report'
      : `### ❌ E2E tests failed (${counts.failed})`

  const statLine =
    counts.total === 0
      ? `No test results were generated. Check the [workflow run](${runUrl}) for build or setup errors.`
      : [
          `**${counts.passed} passed**`,
          counts.failed > 0 ? `**${counts.failed} failed**` : null,
          counts.flaky > 0 ? `${counts.flaky} flaky` : null,
          counts.skipped > 0 ? `${counts.skipped} skipped` : null,
          `${counts.total} total`,
        ]
          .filter(Boolean)
          .join(' · ')

  const metaParts = []
  if (duration > 0) {
    metaParts.push(`⏱️ ${formatDuration(duration)}`)
  }
  if (sha) {
    metaParts.push(`\`${sha.substring(0, 7)}\``)
  }
  metaParts.push(`[Run #${runNumber}](${runUrl})`)
  if (reportUrl) {
    metaParts.push(`[Playwright report](${reportUrl})`)
  }

  const lines = [MARKER, heading, '', statLine, metaParts.join(' · ')]

  if (failures.length > 0) {
    lines.push('', '<details open>', '<summary>Failing tests</summary>', '')
    lines.push('| | Test | Duration |')
    lines.push('| --- | --- | --- |')
    const shown = failures.slice(0, MAX_FAILURES_LISTED)
    for (const failure of shown) {
      const emoji = STATUS_EMOJI[failure.status] ?? '❌'
      const safeTitle = failure.title.replace(/\|/g, '\\|')
      lines.push(
        `| ${emoji} | ${safeTitle} | ${formatDuration(failure.duration)} |`
      )
    }
    if (failures.length > shown.length) {
      lines.push(
        '',
        `_…and ${failures.length - shown.length} more. See the Playwright report for details._`
      )
    }
    lines.push('', '</details>')
  }

  return lines.join('\n')
}

function isBotAuthor(comment) {
  const user = comment.user
  if (!user) {
    return false
  }
  return user.type === 'Bot' || user.login === 'github-actions[bot]'
}

async function upsertComment({ github, owner, repo, issueNumber, body }) {
  let existing = null
  for await (const { data: comments } of github.paginate.iterator(
    github.rest.issues.listComments,
    { owner, repo, issue_number: issueNumber, per_page: 100 }
  )) {
    existing = comments.find(
      (c) => c.body && c.body.includes(MARKER) && isBotAuthor(c)
    )
    if (existing) {
      break
    }
  }
  if (existing) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    })
    console.log(`Updated comment on #${issueNumber} (id ${existing.id})`)
  } else {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })
    console.log(`Created comment on #${issueNumber}`)
  }
}

module.exports = async ({
  github,
  context,
  reportPath,
  reportUrl,
  prNumber,
  sha,
}) => {
  const owner = context.repo.owner
  const repo = context.repo.repo
  const issueNumber = Number(prNumber || context.payload.pull_request?.number)
  if (!Number.isFinite(issueNumber)) {
    console.warn('No PR number resolved; skipping comment.')
    return
  }

  const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`
  const runNumber = context.runNumber ?? process.env.GITHUB_RUN_NUMBER ?? ''
  const report = readReport(reportPath)
  const summary = report
    ? summarize(report)
    : {
        counts: { passed: 0, failed: 0, skipped: 0, flaky: 0, total: 0 },
        failures: [],
        duration: 0,
      }

  const body = buildBody({
    summary,
    runUrl,
    runNumber,
    reportUrl: reportUrl || '',
    sha: sha || context.payload.pull_request?.head?.sha || context.sha,
  })

  await upsertComment({ github, owner, repo, issueNumber, body })
}
