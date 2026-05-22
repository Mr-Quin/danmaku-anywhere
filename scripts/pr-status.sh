#!/usr/bin/env bash
# One-shot PR status for the /da-dev review-monitoring loop.
# Usage: scripts/pr-status.sh <pr-number>
set -euo pipefail

PR="${1:?usage: scripts/pr-status.sh <pr-number>}"

# Derive owner/repo from origin so the script works for any fork.
REMOTE_URL="$(git remote get-url origin)"
SLUG="$(printf '%s' "$REMOTE_URL" | sed -E 's#(.*github\.com[:/])([^/]+)/([^/.]+)(\.git)?$#\2/\3#')"
OWNER="${SLUG%%/*}"
REPO="${SLUG##*/}"

gh api graphql -F number="$PR" -F owner="$OWNER" -F repo="$REPO" -f query='
  query($number: Int!, $owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviews(first: 30) { nodes { author { login } state submittedAt } }
        reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Bot { login } } } }
        reviewThreads(first: 50) { nodes { id isResolved viewerCanResolve comments(last: 1) { nodes { author { login } body } } } }
        reactionGroups { content reactors(first: 5) { nodes { ... on User { login } ... on Bot { login } } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state contexts(first: 30) { nodes {
          __typename
          ... on CheckRun { name conclusion }
          ... on StatusContext { context state }
        } } } } } }
      }
    }
  }' | jq '{
    reviews:           .data.repository.pullRequest.reviews.nodes,
    pending_reviewers: [.data.repository.pullRequest.reviewRequests.nodes[].requestedReviewer.login],
    open_threads:      [.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not) | { id, latestAuthor: .comments.nodes[0].author.login, viewerCanResolve }],
    reactions:         [.data.repository.pullRequest.reactionGroups[] | select((.reactors.nodes | length) > 0) | { content, by: [.reactors.nodes[].login] }],
    checks:            .data.repository.pullRequest.commits.nodes[0].commit.statusCheckRollup
  }'
