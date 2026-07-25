# Agent-Verify Workflow

Full Step 0 + four-phase SOP for web projects. Pair with the `web-project` skill and project Jira/GitLab tooling.

## Flow overview

| Step | Name | Stop point | Output |
|---|---|---|---|
| **Step 0** | startup explanation + understanding confirm | Answer `理解` | — |
| Phase 1 | collect verification context | Answer per question | ticket / MR / env |
| Phase 2 | expected behavior confirm | Answer confirm plan | `tmp/{TICKET}/test-plan/plan.md` + `spec.json` |
| Phase 3 | agent acceptance | Answer confirm results | `tmp/{TICKET}/snapshot/T*.png` |
| Phase 4 | publish results | completion notice | Jira comment + MR note |

## Step 0 — mandatory before Phase 1

Show the user the full flow and prerequisites:

- Phase 1 collects Jira ticket, MR, and local env
- Phase 2 writes `plan.md` + `spec.json`; **must** Answer-confirm before Phase 3
- Phase 3 runs Playwright from spec; FAIL loops until all PASS
- Phase 4 publishes MR note + Jira inline preview; code fixes need explicit user approval

Answer options:

- `理解`
- `有疑問`

Do **not** enter Phase 1 until the user selects `理解`.

## Phase 1 — collect context

Ask one question at a time via Answer.

### Q1 — Jira ticket (required)

- Format: `[A-Z]+-\d+`
- Read ticket with project Jira tooling before Phase 2

### Q2 — MR (conditional)

- Try branch-linked MR first
- If none found, ask for MR ID or URL

### Q3 — local env (optional)

Options:

1. **Use current local env (Recommended)**
2. **Specify profile** (project-specific, e.g. brand/stage/layout)
3. **Full override** (confirm env vars that affect the dev server)

If env changes, restart the dev server before Phase 3.

## Phase 2 — test plan

1. Read Jira acceptance criteria + MR diff/description
2. Scan source for **`data-testid`** before writing selectors
3. Produce:

| Output | Path | Purpose |
|---|---|---|
| human plan | `tmp/{TICKET}/test-plan/plan.md` | Answer confirm |
| machine spec | `tmp/{TICKET}/test-plan/spec.json` | Playwright execution |

4. **Mandatory stop**: Answer confirm both files
   - `確認，開始代理驗收` / `需要調整（我會補充）`

## Phase 3 — agent acceptance

1. Ensure dev server is running
2. Create dirs: `snapshot/`, `debug/`, `scripts/`
3. Run capture:

```bash
node scripts/run-capture.mjs --ticket={TICKET}
```

4. On FAIL:

```bash
node scripts/run-debug.mjs --ticket={TICKET} --route={ROUTE}
```

5. Update `spec.json` results and `plan.md` summary table
6. Loop fix → rerun until all PASS
7. Generate `verification-report.md`
8. **Mandatory stop**: Answer confirm before Phase 4

## Phase 4 — publish

1. If Phase 3 changed code, commit/push only with user approval
2. Publish:

```bash
node scripts/publish-verification-results.mjs \
  --ticket={TICKET} --mr={MR_IID} \
  --spec=tmp/{TICKET}/test-plan/spec.json \
  --plan=tmp/{TICKET}/test-plan/plan.md \
  --report=tmp/{TICKET}/verification-report.md \
  --snapshot-dir=tmp/{TICKET}/snapshot \
  --update-mr=true --post-jira=true
```

3. Jira comment must use inline preview, not attachment-only upload
4. MR report goes to a **standalone note**, not description overwrite

## Prohibited behavior

- Skip Step 0 and go straight to Phase 1
- Skip Answer confirm before capture or publish
- Upload Jira attachments without inline preview comment
- Overwrite MR description with verification report
- Proceed to Phase 4 while any test item is FAIL
- Change production mechanisms only to make tests pass
- Ask the user to accept FAIL results

## Optional MR handoff pattern

If your project has a start-task → MR workflow, you may offer agent-verify immediately after MR creation:

1. Detect successful MR from branch/context
2. Answer: `是，啟動 agent-verify` / `稍後再說`
3. If confirmed, prefill ticket + MR in Phase 1 summary instead of re-asking from scratch

Adapt field names and tooling paths to your project.
