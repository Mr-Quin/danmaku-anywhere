const RE_REVIEW_LABEL = 'ai-rereview'

const BOTS = [
  {
    name: 'copilot',
    login: 'copilot-pull-request-reviewer[bot]',
    trigger: async ({ github, owner, repo, pull_number }) => {
      await github.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number,
        reviewers: ['copilot-pull-request-reviewer'],
      })
    },
  },
  {
    name: 'gemini',
    login: 'gemini-code-assist[bot]',
    trigger: async ({ github, owner, repo, pull_number }) => {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: '/gemini review',
      })
    },
  },
]

const hasLabel = (pullRequest, labelName) => {
  const labels = pullRequest?.labels ?? []
  return labels.some((label) => label?.name === labelName)
}

const hasReviewedHead = (reviews, botLogin, headSha) => {
  return reviews.some(
    (review) =>
      review?.user?.login === botLogin &&
      review?.state !== 'PENDING' &&
      review?.commit_id === headSha
  )
}

const hasPendingRequest = (requestedReviewers, botLogin) => {
  const baseLogin = botLogin.replace(/\[bot\]$/, '')
  return requestedReviewers.some(
    (reviewer) => reviewer?.login === botLogin || reviewer?.login === baseLogin
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

  const requestedReviewers = pullRequest.requested_reviewers ?? []

  for (const bot of BOTS) {
    if (hasReviewedHead(reviews, bot.login, headSha)) {
      core.info(
        `${bot.name} (${bot.login}) already reviewed head ${headSha}; skipping.`
      )
      continue
    }

    if (hasPendingRequest(requestedReviewers, bot.login)) {
      core.info(
        `${bot.name} (${bot.login}) already has a pending review request; skipping.`
      )
      continue
    }

    core.info(`Triggering re-review for ${bot.name} (${bot.login}).`)
    try {
      await bot.trigger({ github, owner, repo, pull_number })
      core.info(`Re-review triggered for ${bot.name}.`)
    } catch (error) {
      core.warning(
        `Failed to trigger re-review for ${bot.name}: ${error.message}`
      )
    }
  }
}

module.exports = { run }
