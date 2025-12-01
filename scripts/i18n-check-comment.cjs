module.exports = async ({ github, context, core, outcome }) => {
  const owner = context.repo.owner
  const repo = context.repo.repo
  const issue_number = context.payload.pull_request.number
  const marker = '<!-- i18n-check -->'
  const checkFailed = outcome === 'failure'

  const findExistingComment = async () => {
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number,
      per_page: 100,
    })

    return comments.find((comment) => comment.body?.includes(marker))
  }

  if (checkFailed) {
    const commentLines = [
      marker,
      '## ⚠️ i18n Translation Issues',
      '',
      'The i18n check has failed. This usually means there are missing or outdated translation keys.',
      '',
      '**To fix this issue:**',
      '',
      '1. Run the following command to extract and update translation keys:',
      '   ```bash',
      '   pnpm i18n extract',
      '   ```',
      '',
      '2. Review the changes in the translation files',
      '3. Commit and push the updated translation files',
      '',
      '**Note:** This command should be run from the `packages/danmaku-anywhere` directory, or from the repository root.',
      '',
    ]

    const body = commentLines.join('\n')
    const existingComment = await findExistingComment()

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
  } else {
    const existingComment = await findExistingComment()

    if (existingComment) {
      await github.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: existingComment.id,
      })
    }

    core.info('i18n check passed')
  }
}
