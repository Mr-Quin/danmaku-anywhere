const TITLE_PATTERN = /^\((extension|app|proxy|chore|docs)\)\s.+\s\[DA-\d+\]$/
const TASK_ID_PATTERN = /DA-\d+/
const MARKER = '<!-- pr-title-check -->'
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2'
const CLICKUP_TYPE_FIELD_NAME = 'type'

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

const buildClickUpTypeMismatchComment = ({
  title,
  taskId,
  expectedType,
  actualType,
}) => [
  MARKER,
  '## ⚠️ PR Title Type Mismatch',
  '',
  'The PR title type does not match the ClickUp task type.',
  '',
  '**Current title:**',
  '```',
  `${title}`,
  '```',
  '',
  '**ClickUp task:**',
  '```',
  `${taskId}`,
  '```',
  '',
  '**Details:**',
  `- **Title type**: \`${expectedType ?? 'unknown'}\``,
  `- **ClickUp type**: \`${actualType ?? 'unknown'}\``,
  '',
  'Please update the PR title to match the ClickUp task type.',
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

const getTitleType = (title) => {
  const match = title.match(/^\(([^)]+)\)\s+/)
  return match?.[1]?.trim()
}

const getBranchTaskId = (branchName) => {
  const match = branchName.match(TASK_ID_PATTERN)
  return match?.[0]
}

const normalizeTypeValue = (value) => value?.toString().trim().toLowerCase()

const getClickUpTypeValue = (customFields) => {
  if (!Array.isArray(customFields)) {
    return undefined
  }

  const typeField = customFields.find(
    (field) => normalizeTypeValue(field?.name) === CLICKUP_TYPE_FIELD_NAME
  )

  if (!typeField?.value) {
    return undefined
  }

  if (typeof typeField.value === 'string') {
    return typeField.value
  }

  if (typeof typeField.value === 'object') {
    return typeField.value.value ?? typeField.value.name ?? typeField.value.id
  }

  return typeField.value
}

const fetchClickUpTask = async ({ token, teamId, taskId }) => {
  const url = `${CLICKUP_API_BASE_URL}/task/${encodeURIComponent(
    taskId
  )}?custom_task_ids=true&team_id=${encodeURIComponent(teamId)}`

  const response = await fetch(url, {
    headers: {
      Authorization: token,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `ClickUp API error (${response.status}): ${response.statusText}. ${errorBody}`
    )
  }

  return response.json()
}

const buildContext = ({ core, github, context }) => {
  const title = context.payload.pull_request?.title ?? ''
  const branchName = context.payload.pull_request?.head?.ref ?? ''
  const owner = context.repo.owner
  const repo = context.repo.repo
  const issue_number = context.payload.pull_request.number
  const titleTaskId = getTitleTaskId(title)
  const branchTaskId = getBranchTaskId(branchName)
  const titleType = getTitleType(title)
  const clickUpToken = process.env.CLICKUP_API_TOKEN
  const clickUpTeamId = process.env.CLICKUP_TEAM_ID

  return {
    core,
    github,
    owner,
    repo,
    issue_number,
    title,
    branchName,
    titleTaskId,
    branchTaskId,
    titleType,
    clickUpToken,
    clickUpTeamId,
  }
}

const handleFailure = async ({ context, errorMessage, body }) => {
  await updateOrCreateComment({
    github: context.github,
    owner: context.owner,
    repo: context.repo,
    issue_number: context.issue_number,
    body,
  })

  context.core.setFailed(errorMessage)
}

const checks = [
  {
    name: 'title-format',
    run: async (context) => {
      if (TITLE_PATTERN.test(context.title)) {
        return { status: 'pass' }
      }

      const errorMessage = `Invalid PR title: "${context.title}".\n\nExpected: (TYPE) description [TASK-ID]\n- TYPE: one of extension, app, proxy, chore, docs\n- TASK-ID: DA-<number> (e.g., DA-123)`
      const body = buildTitleFormatComment(context.title).join('\n')

      return { status: 'fail', errorMessage, body }
    },
  },
  {
    name: 'branch-task-id',
    run: async (context) => {
      if (
        !context.branchTaskId ||
        context.titleTaskId === context.branchTaskId
      ) {
        return { status: 'pass' }
      }

      const errorMessage = `PR title task ID "${context.titleTaskId}" does not match branch task ID "${context.branchTaskId}".`
      const body = buildBranchMismatchComment({
        title: context.title,
        branchName: context.branchName,
        titleTaskId: context.titleTaskId,
        branchTaskId: context.branchTaskId,
      }).join('\n')

      return { status: 'fail', errorMessage, body }
    },
  },
  {
    name: 'clickup-type',
    run: async (context) => {
      if (
        !context.clickUpToken ||
        !context.clickUpTeamId ||
        !context.titleTaskId
      ) {
        context.core.info(
          'ClickUp credentials not configured; skipping ClickUp type check.'
        )
        return { status: 'skip' }
      }

      try {
        const task = await fetchClickUpTask({
          token: context.clickUpToken,
          teamId: context.clickUpTeamId,
          taskId: context.titleTaskId,
        })
        const clickUpType = getClickUpTypeValue(task?.custom_fields)
        const normalizedTitleType = normalizeTypeValue(context.titleType)
        const normalizedClickUpType = normalizeTypeValue(clickUpType)

        if (!normalizedTitleType || !normalizedClickUpType) {
          context.core.info(
            'ClickUp task type or title type is missing; skipping type check.'
          )
          return { status: 'skip' }
        }

        if (normalizedTitleType === normalizedClickUpType) {
          return { status: 'pass' }
        }

        const errorMessage = `PR title type "${context.titleType}" does not match ClickUp task type "${clickUpType}".`
        const body = buildClickUpTypeMismatchComment({
          title: context.title,
          taskId: context.titleTaskId,
          expectedType: context.titleType,
          actualType: clickUpType,
        }).join('\n')

        return { status: 'fail', errorMessage, body }
      } catch (error) {
        context.core.warning(
          `Failed to validate ClickUp task type for ${context.titleTaskId}: ${error.message}`
        )
        return { status: 'skip' }
      }
    },
  },
]

const run = async ({ core, github, context }) => {
  const runtimeContext = buildContext({ core, github, context })

  for (const check of checks) {
    const result = await check.run(runtimeContext)
    if (result?.status === 'fail') {
      await handleFailure({
        context: runtimeContext,
        errorMessage: result.errorMessage,
        body: result.body,
      })
      return
    }
  }

  await deleteCommentIfExists({
    github,
    owner: runtimeContext.owner,
    repo: runtimeContext.repo,
    issue_number: runtimeContext.issue_number,
  })

  core.info(`PR title is valid: ${runtimeContext.title}`)
}

module.exports = { run }
