const RE_REVIEW_LABEL = 'ai-rereview'
const GEMINI_LOGIN = 'gemini-code-assist[bot]'
const GEMINI_REVIEW_COMMAND = '/gemini review'

const hasLabel = (pullRequest, labelName) => {
  const labels = pullRequest?.labels ?? []
  return labels.some((label) => label?.name === labelName)
}

const hasReviewedHead = (reviews, botLogin, headSha) => {
  const target = botLogin.toLowerCase()
  return reviews.some(
    (review) =>
      review?.user?.login?.toLowerCase() === target &&
      review?.state !== 'PENDING' &&
      review?.commit_id === headSha
  )
}

const run = async ({ core, github, context }) => {
  const pullRequest = context.payload.pull_request

  if (!pullRequest) {
    core.info('No pull_request payload; skipping.')
    return
  }

  if (!hasLabel(pullRequest, RE_REVIEW_LABEL)) {
    core.info(
      `Label "${RE_REVIEW_LABEL}" not present on PR #${pullRequest.number}; skipping.`
    )
    return
  }

  const owner = context.repo.owner
  const repo = context.repo.repo
  const pull_number = pullRequest.number
  const headSha = pullRequest.head.sha

  const reviews = await github.paginate(github.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  })

  if (hasReviewedHead(reviews, GEMINI_LOGIN, headSha)) {
    core.info(`Gemini already reviewed head ${headSha}; skipping.`)
    return
  }

  core.info('Posting /gemini review comment.')
  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body: GEMINI_REVIEW_COMMAND,
  })
  core.info('Re-review triggered for Gemini.')
}

module.exports = { run }
