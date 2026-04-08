---
name: da-dev
description: Use when implementing features, fixing bugs, or making any code/config changes that need a PR — orchestrates the full dev workflow from ClickUp task to PR with review monitoring
---

# da-dev — Development Workflow

Task: $ARGUMENTS

Orchestrates: ClickUp task → branch → implement → verify → self-review → human gate → PR → review monitoring → human handoff.

## Step Details

### 1. ClickUp Task

Search Extension Tasks list for an existing task. If none, create one:

- **List ID**: `901309979467` (Extension Tasks under Dev tasks)
- **Type field ID**: `e8372633-e6ec-4cec-93ab-bea34f57f701`
- **Type option IDs**:
  - Extension: `8a8f30a3-3f61-452a-9c90-132149f3ea71`
  - App: `301521c2-4110-439c-8d87-92cfbf62ca48`
  - Proxy: `43ba1953-371b-49f5-9a8c-ebdb6cfa7bad`
  - Chore: `1c48d81d-fb7f-474e-9d28-09c024f1314d`
  - Docs: `8f33f585-082f-4eb2-b229-5d235e8689e2`

Pick the Type based on the scope of the change. Get the custom ID (DA-XXX) from the created/found task.

### 2. Branch

```bash
git fetch origin master
# For features/fixes — use a worktree:
git worktree add ../danmaku-anywhere-DA-XXX -b DA-XXX_description origin/master
# For trivial changes — branch directly:
git checkout -b DA-XXX_description origin/master
```

Reuse an existing worktree if its previous work is already done.

### 2b. Worktree Handoff

**If a worktree was created**, hand off to a new Claude session running in it:

1. Write `.claude-task.md` in the worktree root with the task context:

```markdown
# Task: <task description>
- **ClickUp ID**: DA-XXX
- **Type**: <extension|app|proxy|chore|docs>
- **Branch**: DA-XXX_description

## Instructions
Execute the da-dev workflow starting from step 3 (Implement).
Read `.claude/commands/da-dev.md` for the full workflow.
Steps 1–2 are already complete.
```

2. Open Claude in a new tab:

```bash
wt -w 0 new-tab -d '<worktree-path>' -- claude --permission-mode acceptEdits 'Read .claude-task.md and follow the instructions'
```

3. **Stop here.** The current session is done. The new Claude session handles steps 3–8.

**If no worktree** (trivial change on a local branch), continue with steps 3–8 below.

### 3. Implement

Make the changes. Follow CLAUDE.md conventions.

### 4. Verify

Always run lint and type-check. For tests and build, follow the relevant area's process:

| Area          | Verify command                              | Manual verification                               |
| ------------- | ------------------------------------------- | ------------------------------------------------- |
| Extension     | See `packages/danmaku-anywhere/AGENTS.md`   | **Open dev browser** at start of work (see below) |
| Web app       | See `app/web/AGENTS.md`                     | **CF preview URL** from PR deploy comment         |
| Backend       | See `backend/proxy/AGENTS.md`               | N/A                                               |
| Packages      | `pnpm test --filter <package>`              | N/A                                               |
| Cross-cutting | `pnpm type-check && pnpm lint && pnpm test` | Depends on areas touched                          |

#### Extension: open dev browser

For extension changes, launch a dev browser with HMR **at the start of implementation**:

```bash
wt -w 0 new-tab -d '<worktree-path>/packages/danmaku-anywhere' -- node e2e/open-browser.ts
```

Human verifies behavior live. Skip for trivial changes (config-only, types, docs).

#### Web app: Cloudflare preview

After the PR is created, Cloudflare posts a preview URL. Include it when alerting the human.

### 5. Commit and Self-Review

```bash
git add <specific files>
git commit -m "<descriptive message>"
```

Before pushing, run reviews using **clean subagents** (no prior context):

- Always run `/review`
- Run `/security-review` when the change touches user input, auth, APIs, or data storage

Fix any issues found, then add a commit. Never include Co-Authored-By or AI attribution.

### 6. Human Gate

- **Simple** (docs, config, skills, formatting): proceed directly to PR
- **Substantive** (bug fix, feature, refactor): alert human with summary + review results, **wait for explicit go**
- **When in doubt**: alert the human

### 7. Push and Create PR

```bash
git push -u origin DA-XXX_description
gh pr create --title "(type) description [DA-XXX]" --body "$(cat <<'EOF'
## Summary
- <bullet points>
EOF
)"
```

- **type** must be one of: `extension`, `app`, `proxy`, `chore`, `docs` (lowercase, CI validates)
- **type must match** the ClickUp task's Type field
- **DA-XXX must match** the branch name
- Do NOT include ClickUp links in the PR body — they are posted automatically

### 8. Review Monitoring

```
/loop 5m check PR #N for review comments, report status, address comments, push fixes
```

**Each iteration reports status:**

```bash
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N/reviews --jq '[.[] | {author: .user.login, state: .state}]'
gh api repos/Mr-Quin/danmaku-anywhere/issues/N/reactions --jq '[.[] | {user: .user.login, reaction: .content}]'
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N --jq '{requested_reviewers: [.requested_reviewers[]? | .login]}'
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N/comments
gh pr checks N
```

**When review comments are found:**

1. **Evaluate validity** — not all bot suggestions are correct
2. **If valid**: fix, reply with what changed
3. **If not valid**: reply with why it was declined
4. **Resolve the thread**:

```bash
gh api graphql -f query='{ repository(owner: "Mr-Quin", name: "danmaku-anywhere") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved } } } } }'
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

**Stop the loop when ALL are true:**

1. All review threads handled (addressed/declined/resolved)
2. No pending reviews (no unmatched eyes reactions, no pending reviewer requests)
3. All CI checks completed — if any **fail**, fix before stopping

**Keep looping when:** bots still processing (eyes emoji without review), reviewers pending, or CI running.

On stop: alert human. **NEVER merge PRs** — merging is always a human action.

### 9. Worktree Cleanup

After the PR is merged, run `/da-cleanup` to remove completed worktrees. This also cleans up stale `additionalDirectories` and `Read(...)` allow rules from `~/.claude/settings.json`.
