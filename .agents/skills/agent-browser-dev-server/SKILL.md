---
name: agent-browser-dev-server
description: Use agent-browser against the Fluid local dev server, including bootstrapping an authenticated session with project scripts, turning successful browser commands into reusable scripts, and choosing stable source-backed selectors or window helpers. Use when working on localhost flows, Fluid dev server QA, agent-browser scripts, or browser automation against the app.
---

# Agent-browser Dev Server

Use this skill for Fluid localhost work. It complements the upstream `agent-browser` skill with project-specific defaults instead of repeating the generic CLI guide.

## Start here

1. Load the current CLI guidance first:

```bash
agent-browser skills get core
```

2. Use one named session per task so browser state stays reusable.
3. Prefer direct app routes and project scripts over clicking through the homepage.
4. If auth/bootstrap is needed, use the separate script instructions in [login-script.md](login-script.md) instead of replaying login manually in chat.

## Read only what you need

- [dev-server-workflow.md](dev-server-workflow.md): day-to-day interaction loop for localhost pages.
- [login-script.md](login-script.md): how to bootstrap an authenticated dev-server session.
- [script-authoring.md](script-authoring.md): how to turn successful commands into a reliable project script.
- [automation-primitives.md](automation-primitives.md): how to make selectors, routes, and `window` hooks automation-friendly.

## Defaults

- Base URL: prefer the exact local server you are testing, usually `http://localhost:5173`.
- Session name: use a task-specific session such as `fluid-dev-server`, `fluid-error-handler`, or `fluid-orders-page`.
- Selector priority: stable `data-*` attribute, then source-backed `eval`, then fresh snapshot refs, and visible text only as a last resort.
- Re-snapshot after any action that can change the DOM, route, dialog stack, or refs.

## Reusable script rule

Every reusable script should have its own markdown instruction file at this skill root. Keep each script and each instruction file focused on one job so the agent only reads the context it needs.

## Escalation path

When browser automation gets flaky:

1. Read [automation-primitives.md](automation-primitives.md).
2. Inspect the relevant route/component source before guessing.
3. Add or request a stable primitive such as a `data-testid`, direct route, or `window` helper.
4. Only then add or update a project script.
