---
name: babysit-pr
description: Use to monitor an open PR for AI/bot review comments, evaluate them critically, push fixes for real issues, and resolve threads — capped at a sensible duration so it self-terminates. Invoke as "babysit PR #N" or after opening a PR.
---

# babysit-pr — supervised PR monitoring loop

Watch a PR for new review activity, evaluate each comment via the `reviewing-ai-feedback` skill (which owns the accept/decline judgment), push fixes when warranted, and stop on its own.

## 0. Decide the duration

Default budget: **30 minutes / 6 iterations at 5-minute cadence.** That covers one or two full AI-reviewer cycles after the initial push and the post-fix re-review. Beyond that, returns are sharply diminishing.

Extend (up to 60 min / 12 iterations) only if:
- A reviewer is still mid-review (eyes reaction without a posted review) at the budget boundary
- CI is still running with no failure yet
- You're actively pushing fixes (don't quit mid-flight)

Shorten if the PR is trivial (≤30 LOC chore/doc): **15 min / 3 iterations** is enough.

Never schedule beyond 60 min in a single sitting. If the PR is still churning after that, hand back to the human.

## 1. Set up the loop

```
/loop 5m babysit PR #<N> per .claude/skills/babysit-pr/SKILL.md
```

The `/loop` skill creates a session-only cron (`*/5 * * * *`) and runs the first iteration immediately. Track iteration count in your own head — when you hit the budget, `CronDelete` the job and notify the human.

## 2. Per-iteration loop

GraphQL snippets below use `<OWNER>/<REPO>` placeholders — resolve from `gh repo view --json owner,name -q '.owner.login + "/" + .name'` (or substitute literally from the current repo) before running.

### 2a. Fetch status

```bash
scripts/pr-status.sh <N>
```

One GraphQL call returns: reviews, pending reviewers, open threads, reactions, check states. Read it carefully — `state: PENDING` on a reviewer means "still working", not "approved".

### 2b. Classify each new comment

Evaluate via the `reviewing-ai-feedback` skill. It defines the accept/decline rules, false-positive patterns, accept-signals, reply style, and the in-chat reporting format. Default stance is "verify against the code; the reviewer is probably right." Decline only with a named rule. Resolve every thread you handle (accepted or declined).

### 2c. Resolve mechanics

```bash
gh api graphql -f query='{ repository(owner: "<OWNER>", name: "<REPO>") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved } } } } }'
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

### 2d. If you pushed fixes

After `git push`, the AI reviewers (gated by the `ai-rereview` label) re-run automatically. Wait one full iteration before re-evaluating — they need 2–4 min to land.

## 3. Stop conditions

Stop the loop and notify the human as soon as **all three** hold:

1. **All threads handled** — every open thread is either fixed+replied+resolved, or skipped+replied+resolved
2. **No pending reviewers** — no `state: PENDING`, no unmatched `eyes` reaction from a bot that hasn't posted yet
3. **CI complete** — every check is `SUCCESS` or `NEUTRAL`. If any is `FAILURE`, fix it first; don't stop while CI is red

Also stop (and notify) on:

- **Budget exhausted** — hit your iteration cap; report what's still outstanding so the human can take over
- **Unresolvable disagreement** — you replied with a rationale and the same reviewer pushed back; hand to the human rather than ping-ponging
- **Risky action needed** — fix would touch shared infrastructure, dependencies, or anything the human should authorize first
- **You're not making progress** — same comment two iterations in a row with no new fix; hand off

To stop:

```
CronDelete <jobId>
```

Then send one message: PR URL, what was addressed, what was skipped (with one-line rationale each), what's still open if anything, and the final CI / reviewer state.

## 4. Anti-patterns

- **Don't push speculative refactors.** "Could be cleaner" is not a reason. The PR is in review, not redesign.
- **Don't resolve a thread without replying** unless it's a pure duplicate. The PR author reads the thread later and needs to know your reasoning.
- **Don't commit Co-Authored-By or AI attribution.**
- **Don't merge.** Ever. Merging is a human action.

## 5. Quick reference

| Action | Command |
|---|---|
| One-shot status | `scripts/pr-status.sh <N>` |
| List threads + IDs | `gh api graphql -f query='{ repository(owner: "<OWNER>", name: "<REPO>") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved comments(first: 5) { nodes { author { login } body } } } } } } }'` |
| Reply on thread | `gh api graphql -f query='mutation { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: "ID", body: "..."}) { comment { id } } }'` |
| Resolve thread | `gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "ID"}) { thread { isResolved } } }'` |
| Stop loop | `CronDelete <jobId>` |
