# Agent Browser Dev Server

Use this reference for localhost browser work during agent-verify fallback or exploratory QA. It complements the upstream `agent-browser` skill with web-project defaults.

## Start here

1. Load the current CLI guidance first:

```bash
agent-browser skills get core
```

2. Use one named session per task so browser state stays reusable.
3. Prefer direct app routes and project scripts over clicking through the homepage.
4. If auth/bootstrap is needed, create a project login script (see `references/login-script.md`).

## Read only what you need

- `references/dev-server-workflow.md` — day-to-day interaction loop for localhost pages
- `references/login-script.md` — how to bootstrap an authenticated dev-server session
- `references/script-authoring.md` — turn successful commands into a reusable project script
- `references/automation-primitives.md` — stable selectors, routes, and `window` helpers

## Defaults

- Base URL: use the exact local server under test, commonly `http://localhost:5173`
- Session name: task-specific, for example `web-dev-server`, `agent-verify-{TICKET}`
- Selector priority: stable `data-testid`, then source-backed `eval`, then fresh snapshot refs; visible text only as last resort
- Re-snapshot after any action that can change the DOM, route, dialog stack, or refs

## Pair with agent-self-verify

During agent-verify Phase 3 fallback:

- session: `agent-verify-{TICKET}`
- explore unknown pages, then codify steps back into `spec.json`
- use `scripts/run-debug.mjs` output to discover `data-testid` values

## Reusable script rule

Each reusable browser script should have its own focused instruction file. Keep scripts and docs single-purpose so agents only read the context they need.

## Escalation path

When browser automation gets flaky:

1. Read `references/automation-primitives.md`
2. Inspect the relevant route/component source before guessing
3. Add or request a stable primitive such as `data-testid`, direct route, or dev-only `window` helper
4. Only then add or update a project script
