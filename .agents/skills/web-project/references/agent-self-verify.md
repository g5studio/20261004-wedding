# Agent Self-Verify

Standardized agent self-verification: Step 0 + four-phase SOP, **Playwright spec primary path**, browser automation fallback, dynamic verification report tables.

## When to use

- User invokes **`agent-verify`**
- User asks for **自我驗證 / 代理驗收 / agent acceptance**
- After an MR is created and the user wants automated local QA before publishing results

## Required reading (order)

1. `references/agent-self-verify-workflow.md` — full Step 0 + Phase 1–4 SOP
2. `references/agent-browser-dev-server.md` — fallback / login bootstrap
3. Project-specific Jira/GitLab tooling (for example `atlassian-script` or internal publish utilities)

## Prerequisites

- Local dev server can reach the pages under test
- Project has Jira + GitLab access configured if Phase 4 publish is needed
- Playwright runs locally (installed on first capture under `tmp/{TICKET}/scripts/`)
- Optional: project agent tooling for Jira reads, MR updates, and signed comments

## Artifact layout

```text
tmp/{TICKET}/
├── test-plan/
│   ├── plan.md              # Phase 2 confirm (human-readable)
│   └── spec.json            # Phase 2 machine-readable source of truth for Phase 3
├── scripts/                 # Playwright local install (gitignore)
├── snapshot/
│   └── T0.png, T1.png …
├── debug/                   # on FAIL
│   ├── T0-debug.json
│   └── debug.json
└── verification-report.md   # Phase 4
```

## Phase 2 — plan.md + spec.json

1. Read Jira + MR + source **`data-testid`**
2. Copy templates from this skill:
   - `templates/test-plan.template.md`
   - `templates/spec.template.json`
3. **Answer confirm both** before Phase 3

### spec.json highlights

Report columns are driven by **`spec.report.columns`**, not a fixed template. If omitted, `scripts/spec-utils.mjs` infers columns from item content.

| Field | Common column |
|---|---|
| `tab` | batch / tab |
| `verifyPoints` | verification item |
| `i18nKeys` | i18n keys (only when needed) |
| `expectedDarkColor` | expected theme color (only when needed) |
| `result` | PASS / FAIL / WARN |
| `screenshot` | screenshot filename |

### Blocking layers (project-specific)

Configure known overlays/modals in `spec.environment.blockingLayers`:

```json
"blockingLayers": {
  "popupSelectors": ["[data-testid=\"terms-modal\"]"],
  "closeSelectors": ["[data-testid=\"terms-accept-btn\"]"]
}
```

Use spec actions when a test item needs to dismiss blockers:

| type | params |
|---|---|
| `dismissAnnouncementPopup` | `maxRound?`, `assertClosed?` — uses `blockingLayers` from spec |
| `assertNoAnnouncementPopup` | — |
| `dismissPopupByTestId` | `testId` / `testIds`, `allowMissing?`, `waitMs?` |

### Other action types

| type | params |
|---|---|
| `goto` | `url` |
| `click` | `testId` |
| `wait` | `testId`, `timeout?` |
| `waitMs` | `ms` |
| `screenshot` | `file`, `fullPage?` |

## Phase 3 — Playwright primary, browser fallback

### Dual-layer PASS standard

Playwright action success **does not** equal verification PASS:

1. **Execution layer** — target page/panel/element reached; screenshot captured
2. **Semantic layer** — agent compares screenshot against `verifyPoints`

Hard FAIL when:

- target page or panel not reached
- modal/overlay still blocks the view
- screenshot shows wrong area or blocked content
- only selector/action succeeded without visual evidence

### Primary — batch capture

```bash
node scripts/run-capture.mjs --ticket={TICKET}
# or
node scripts/run-capture.mjs --spec=tmp/{TICKET}/test-plan/spec.json
```

- Installs Playwright under `tmp/{TICKET}/scripts/` on first run
- Default base URL priority: `--base-url` > `spec.environment.baseUrl` > env vars > `--port` > ticket-derived port (`5600 + ticketNumber % 1000`)

### Fallback — agent-browser

Use when:

- login/session bootstrap is needed (see `references/agent-browser-dev-server.md`)
- exploring unknown pages before codifying spec
- single-step debug after Playwright FAIL

Session name: `agent-verify-{TICKET}`

### Debug helper

```bash
node scripts/run-debug.mjs --ticket={TICKET} --route=/
```

### Fail-handling rules

- Prefer **mock data** or spec adjustment when runtime data is missing
- Do **not** change production mechanisms only to pass QA
- While any item is FAIL, do **not** ask the user to accept/upload results
- Notify only after all items pass semantic review

## Phase 4 — publish results

Requires project Jira/GitLab utilities (`env-loader.mjs`, `agent-signature.mjs`, or equivalent):

```bash
node scripts/publish-verification-results.mjs \
  --ticket={TICKET} \
  --mr={MR_IID} \
  --spec=tmp/{TICKET}/test-plan/spec.json \
  --snapshot-dir=tmp/{TICKET}/snapshot \
  --report=tmp/{TICKET}/verification-report.md \
  --update-mr=true \
  --post-jira=true
```

- MR: standalone note with marker `<!-- agent-verify:{TICKET}:start/end -->` (upsert on re-run)
- Jira: inline ADF image preview + optional `agent-verify` label (idempotent)
- Do **not** overwrite MR description

## Tool split

| Tool | Role |
|---|---|
| Playwright (`scripts/run-capture.mjs`) | deterministic batch QA from spec |
| agent-browser | explore, login, refine spec |
| `scripts/publish-verification-results.mjs` | MR note + Jira inline images |

## Related files

| Path | Role |
|---|---|
| `scripts/spec-utils.mjs` | spec load/save, dynamic report table builder |
| `scripts/run-capture.mjs` | Playwright runner |
| `scripts/run-debug.mjs` | page testId discovery |
| `scripts/publish-verification-results.mjs` | MR + Jira publish |
| `templates/playwright-popup-guard.template.mjs` | popup guard + dual-layer example |
| `references/agent-self-verify-workflow.md` | full command-level SOP |
