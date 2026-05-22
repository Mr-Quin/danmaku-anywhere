const fs = require('node:fs')
const path = require('node:path')

const MARKER = '<!-- danmaku-anywhere:e2e-comment -->'
const ANSI_PATTERN = /\[[0-9;]*m/g

function formatDuration(ms) {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }
  const rounded = Math.round(totalSeconds)
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`
}

function readReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  } catch (error) {
    console.warn(
      `Failed to parse e2e report at ${reportPath}: ${error.message}`
    )
    return null
  }
}

function extractErrorMessage(result) {
  const raw = result?.errors?.[0]?.message ?? ''
  if (!raw) {
    return ''
  }
  const firstLine = raw.replace(ANSI_PATTERN, '').trim().split(/\r?\n/)[0]
  return firstLine.length <= 200
    ? firstLine
    : `${firstLine.slice(0, 199).trimEnd()}…`
}

function collectSpecs(report) {
  const specs = []
  function walk(suite, ancestry) {
    const trail =
      ancestry.length === 0
        ? [suite.file ? path.basename(suite.file) : suite.title]
        : ancestry
    for (const spec of suite.specs ?? []) {
      const test = spec.tests?.[0]
      const result = test?.results?.[test.results.length - 1]
      // Trust test.status for skipped/flaky: when test.skip() runs there are
      // no results[] entries, so falling back to result.status would miscount.
      const status =
        test?.status === 'skipped' || test?.status === 'flaky'
          ? test.status
          : (result?.status ?? (spec.ok ? 'passed' : 'failed'))
      specs.push({
        title: [...trail, spec.title].join(' › '),
        ok: spec.ok !== false,
        status,
        duration: result?.duration ?? 0,
        errorExcerpt: extractErrorMessage(result),
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
    } else if (spec.status === 'flaky') {
      counts.flaky += 1
    } else if (spec.ok) {
      counts.passed += 1
    } else {
      counts.failed += 1
      failures.push(spec)
    }
  }
  return { counts, failures, duration: report.stats?.duration ?? 0 }
}

function buildBody({ summary, runUrl, runNumber, reportUrl, jobUrl, sha }) {
  const { counts, failures, duration } = summary
  const heading =
    counts.total === 0
      ? '### ⚠️ E2E tests did not produce a report'
      : counts.failed === 0
        ? '### ✅ E2E tests passed'
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
    const summaryLabel = jobUrl
      ? `Failing tests · <a href="${jobUrl}">view job logs</a>`
      : 'Failing tests'
    lines.push('', '<details open>', `<summary>${summaryLabel}</summary>`, '')
    for (const failure of failures) {
      const title = failure.title.replace(/\r?\n/g, ' ')
      lines.push(`- ❌ \`${title}\` (${formatDuration(failure.duration)})`)
      if (failure.errorExcerpt) {
        lines.push('  ```', `  ${failure.errorExcerpt}`, '  ```')
      }
    }
    lines.push('', '</details>')
  }

  return lines.join('\n')
}

async function findE2eJobUrl({ github, owner, repo, runId }) {
  try {
    const { data } = await github.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
      per_page: 30,
    })
    const job =
      data.jobs.find((j) => j.name.startsWith('e2e')) ?? data.jobs[0] ?? null
    return job?.html_url ?? ''
  } catch (error) {
    console.warn(`Could not fetch jobs for run: ${error.message}`)
    return ''
  }
}

async function upsertComment({ github, owner, repo, issueNumber, body }) {
  let existing = null
  for await (const { data: comments } of github.paginate.iterator(
    github.rest.issues.listComments,
    { owner, repo, issue_number: issueNumber, per_page: 100 }
  )) {
    existing = comments.find(
      (c) =>
        c.body?.includes(MARKER) &&
        (c.user?.type === 'Bot' || c.user?.login === 'github-actions[bot]')
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
  const issueNumber = Number(prNumber)

  const report = readReport(reportPath)
  const summary = report
    ? summarize(report)
    : {
        counts: { passed: 0, failed: 0, skipped: 0, flaky: 0, total: 0 },
        failures: [],
        duration: 0,
      }

  const jobUrl =
    summary.failures.length > 0
      ? await findE2eJobUrl({ github, owner, repo, runId: context.runId })
      : ''

  const body = buildBody({
    summary,
    runUrl: `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`,
    runNumber: context.runNumber,
    reportUrl: reportUrl || '',
    jobUrl,
    sha,
  })

  await upsertComment({ github, owner, repo, issueNumber, body })
}
