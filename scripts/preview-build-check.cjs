const LONG_LIVED_LABEL = 'preview branch'
const PREVIEW_LABEL = 'preview release'

function sanitizeBranchSlug(ref) {
  return String(ref)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

function deriveFeatureName(title) {
  if (!title) {
    return ''
  }
  return String(title)
    .replace(/^\s*\([^)]*\)\s*/, '')
    .replace(/\s*\[[A-Z]+-\d+\]\s*$/, '')
    .trim()
}

module.exports = async ({ github, context, core }) => {
  let should_run = false
  let ref = context.sha
  let is_nightly = false
  let is_pr = false
  let pr_number = ''
  let is_long_lived = false
  let branch_slug = ''
  let feature_name = ''

  if (context.eventName === 'workflow_dispatch') {
    console.log('Triggered manually.')
    should_run = true
    ref = context.ref
  } else if (context.eventName === 'pull_request') {
    is_pr = true
    pr_number = context.payload.pull_request.number
    const labels = context.payload.pull_request.labels.map((l) => l.name)
    const hasLongLived = labels.includes(LONG_LIVED_LABEL)
    const hasPreview = labels.includes(PREVIEW_LABEL)
    if (hasLongLived) {
      console.log(`PR has '${LONG_LIVED_LABEL}' label — long-lived channel.`)
      should_run = true
      is_long_lived = true
      ref = context.payload.pull_request.head.sha
      const headRef = context.payload.pull_request.head.ref
      branch_slug = sanitizeBranchSlug(headRef)
      feature_name = deriveFeatureName(context.payload.pull_request.title)
      if (!branch_slug) {
        core.setFailed(
          `Could not derive a non-empty branch slug from head ref '${headRef}'.`
        )
        return
      }
      console.log(`branch_slug=${branch_slug} feature_name='${feature_name}'`)
    } else if (hasPreview) {
      console.log(`PR has '${PREVIEW_LABEL}' label.`)
      should_run = true
      ref = context.payload.pull_request.head.sha
    } else {
      console.log('PR does not have a preview label.')
    }
  } else if (context.eventName === 'schedule') {
    is_nightly = true
    try {
      const { data: tagRef } = await github.rest.git.getRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: 'tags/latest-preview',
      })
      const latestPreviewSha = tagRef.object.sha
      const currentSha = context.sha

      console.log(`Latest preview SHA: ${latestPreviewSha}`)
      console.log(`Current SHA: ${currentSha}`)

      if (latestPreviewSha !== currentSha) {
        console.log('Changes detected since last nightly.')
        should_run = true
      } else {
        console.log('No changes since last nightly.')
      }
    } catch (error) {
      if (error.status === 404) {
        console.log('latest-preview tag not found, treating as first run.')
        should_run = true
      } else {
        throw error
      }
    }
  }

  core.setOutput('should_run', should_run)
  core.setOutput('ref', ref)
  core.setOutput('is_nightly', is_nightly)
  core.setOutput('is_pr', is_pr)
  core.setOutput('pr_number', pr_number)
  core.setOutput('is_long_lived', is_long_lived)
  core.setOutput('branch_slug', branch_slug)
  core.setOutput('feature_name', feature_name)
}

module.exports.sanitizeBranchSlug = sanitizeBranchSlug
module.exports.deriveFeatureName = deriveFeatureName
