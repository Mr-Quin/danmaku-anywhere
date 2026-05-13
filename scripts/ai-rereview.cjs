const RE_REVIEW_LABEL = 'ai-rereview'

const BOTS = [
  {
    name: 'gemini',
    reviewLogin: 'gemini-code-assist[bot]',
    command: '/gemini review',
  },
  {
    name: 'copilot',
    reviewLogin: 'copilot-pull-request-reviewer[bot]',
    command: '@copilot review',
  },
]

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

  for (const bot of BOTS) {
    if (hasReviewedHead(reviews, bot.reviewLogin, headSha)) {
      core.info(`${bot.name} already reviewed head ${headSha}; skipping.`)
      continue
    }

    core.info(`Posting "${bot.command}" for ${bot.name}.`)
    try {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: bot.command,
      })
      core.info(`Re-review triggered for ${bot.name}.`)
    } catch (error) {
      core.warning(
        `Failed to trigger re-review for ${bot.name}: ${error.message}`
      )
    }
  }
}

module.exports = { run }
