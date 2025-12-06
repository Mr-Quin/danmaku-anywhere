module.exports = async ({ github, context, core }) => {
  let should_run = false
  let ref = context.sha
  let is_nightly = false
  let is_pr = false
  let pr_number = ''

  if (context.eventName === 'workflow_dispatch') {
    console.log('Triggered manually.')
    should_run = true
    ref = context.ref
  } else if (context.eventName === 'pull_request') {
    is_pr = true
    pr_number = context.payload.pull_request.number
    const labels = context.payload.pull_request.labels.map((l) => l.name)
    if (labels.includes('preview release')) {
      console.log('PR has preview release label.')
      should_run = true
      ref = context.payload.pull_request.head.sha
    } else {
      console.log('PR does not have preview release label.')
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
}
