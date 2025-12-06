module.exports = async ({ github, context }) => {
  const tagName = 'latest-preview'
  const sha = context.sha

  try {
    await github.rest.git.updateRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `tags/${tagName}`,
      sha: sha,
      force: true,
    })
    console.log(`Updated ${tagName} to ${sha}`)
  } catch (error) {
    if (error.status === 404 || error.status === 422) {
      // Tag might not exist, create it
      await github.rest.git.createRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: `refs/tags/${tagName}`,
        sha: sha,
      })
      console.log(`Created ${tagName} at ${sha}`)
    } else {
      throw error
    }
  }
}
