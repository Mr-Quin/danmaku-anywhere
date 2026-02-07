const TITLE_PATTERN = /^\((extension|app|proxy|chore|docs)\)\s.+\s\[DA-\d+\]$/
const TASK_ID_PATTERN = /DA-\d+/
const MARKER = '<!-- pr-title-check -->'

const buildTitleFormatComment = (title) => [
  MARKER,
  '## ⚠️ PR Title Format Issue',
  '',
  "The PR title doesn't match the required format.",
  '',
  '**Current title:**',
  '```',
  `${title}`,
  '```',
  '',
  '**Expected format:**',
  '```',
  '(TYPE) description [TASK-ID]',
  '```',
  '',
  '**Details:**',
  '- **TYPE**: Must be one of: `extension`, `app`, `proxy`, `chore`, `docs`',
  '- **description**: A brief description of the changes',
  '- **TASK-ID**: Must match the pattern `DA-<number>` (e.g., `DA-123`)',
  '',
  '**Example:**',
  '```',
  '(app) Add user authentication [DA-456]',
  '```',
  '',
  'Please update your PR title to match this format.',
]

const buildBranchMismatchComment = ({
  title,
  branchName,
  titleTaskId,
  branchTaskId,
}) => [
  MARKER,
  '## ⚠️ PR Title Task ID Mismatch',
  '',
  'The PR title task ID does not match the task ID in the branch name.',
  '',
  '**Current title:**',
  '```',
  `${title}`,
  '```',
  '',
  '**Branch name:**',
  '```',
  `${branchName}`,
  '```',
  '',
  '**Details:**',
  `- **Title task ID**: \`${titleTaskId}\``,
  `- **Branch task ID**: \`${branchTaskId}\``,
  '',
  'Please update the PR title or branch name so the task IDs match.',
]

const findExistingComment = async ({ github, owner, repo, issue_number }) => {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  })

  return comments.find((comment) => comment.body?.includes(MARKER))
}

const updateOrCreateComment = async ({
  github,
  owner,
  repo,
  issue_number,
  body,
}) => {
  const existingComment = await findExistingComment({
    github,
    owner,
    repo,
    issue_number,
  })

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    })
  } else {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    })
  }
}

const deleteCommentIfExists = async ({ github, owner, repo, issue_number }) => {
  const existingComment = await findExistingComment({
    github,
    owner,
    repo,
    issue_number,
  })

  if (existingComment) {
    await github.rest.issues.deleteComment({
      owner,
      repo,
      comment_id: existingComment.id,
    })
  }
}

const getTitleTaskId = (title) => {
  const match = title.match(/\[(DA-\d+)\]\s*$/)
  return match?.[1]
}

const getBranchTaskId = (branchName) => {
  const match = branchName.match(TASK_ID_PATTERN)
  return match?.[0]
}

const run = async ({ core, github, context }) => {
  const title = context.payload.pull_request?.title ?? ''
  const branchName = context.payload.pull_request?.head?.ref ?? ''
  const owner = context.repo.owner
  const repo = context.repo.repo
  const issue_number = context.payload.pull_request.number
  const titleTaskId = getTitleTaskId(title)
  const branchTaskId = getBranchTaskId(branchName)

  if (!TITLE_PATTERN.test(title)) {
    const errorMessage = `Invalid PR title: "${title}".\n\nExpected: (TYPE) description [TASK-ID]\n- TYPE: one of extension, app, proxy, chore, docs\n- TASK-ID: DA-<number> (e.g., DA-123)`
    const body = buildTitleFormatComment(title).join('\n')

    await updateOrCreateComment({
      github,
      owner,
      repo,
      issue_number,
      body,
    })

    core.setFailed(errorMessage)
    return
  }

  if (branchTaskId && titleTaskId !== branchTaskId) {
    const errorMessage = `PR title task ID "${titleTaskId}" does not match branch task ID "${branchTaskId}".`
    const body = buildBranchMismatchComment({
      title,
      branchName,
      titleTaskId,
      branchTaskId,
    }).join('\n')

    await updateOrCreateComment({
      github,
      owner,
      repo,
      issue_number,
      body,
    })

    core.setFailed(errorMessage)
    return
  }

  await deleteCommentIfExists({
    github,
    owner,
    repo,
    issue_number,
  })

  core.info(`PR title is valid: ${title}`)
}

module.exports = { run }
