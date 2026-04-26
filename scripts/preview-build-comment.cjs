module.exports = async ({ github, context, prNumber, ref, runNumber }) => {
  const MARKER = '<!-- danmaku-anywhere:preview-build-comment -->'
  const owner = context.repo.owner
  const repo = context.repo.repo

  const tag = `preview-pr-${prNumber}`
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/tag/${tag}`
  const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`
  const shortSha = String(ref).substring(0, 7)

  const body = [
    MARKER,
    '### 🚀 Preview build ready',
    '',
    `Built from \`${shortSha}\` (run #${runNumber}).`,
    '',
    `📦 [Download from the release page](${releaseUrl}) · [Workflow run](${runUrl})`,
  ].join('\n')

  async function upsertComment(issueNumber) {
    let existing = null
    for await (const { data: comments } of github.paginate.iterator(
      github.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 100,
      }
    )) {
      existing = comments.find((c) => c.body && c.body.includes(MARKER))
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

  await upsertComment(Number(prNumber))

  let issueNumbers = []
  try {
    const linked = await github.graphql(
      `query($owner:String!,$repo:String!,$pr:Int!) {
         repository(owner:$owner, name:$repo) {
           pullRequest(number:$pr) {
             closingIssuesReferences(first: 50) {
               nodes {
                 number
                 repository { nameWithOwner }
               }
             }
           }
         }
       }`,
      { owner, repo, pr: Number(prNumber) }
    )
    const currentRepo = `${owner}/${repo}`
    const nodes =
      linked?.repository?.pullRequest?.closingIssuesReferences?.nodes ?? []
    issueNumbers = [
      ...new Set(
        nodes
          .filter((n) => n?.repository?.nameWithOwner === currentRepo)
          .map((n) => n.number)
      ),
    ]
  } catch (error) {
    console.warn(
      `Failed to fetch linked issues for PR #${prNumber}: ${error.message}`
    )
  }

  for (const num of issueNumbers) {
    try {
      await upsertComment(num)
    } catch (error) {
      console.warn(
        `Failed to comment on linked issue #${num}: ${error.message}`
      )
    }
  }
}
