# Login Script

Use a project-specific bootstrap script when a localhost flow needs an authenticated session. Keep login details in the script, not in the main skill.

## Recommended layout

```text
.cursor/scripts/browser/login.mjs
# or
.agents/skills/{project}/scripts/login.mjs
```

## Example usage

```bash
node .cursor/scripts/browser/login.mjs
node .cursor/scripts/browser/login.mjs --session web-dev-server
node .cursor/scripts/browser/login.mjs --base-url http://localhost:4173
node .cursor/scripts/browser/login.mjs --session web-dev-server --skip-dismiss
```

## What a good login script should do

- resolve credentials from `process.env` first, then repo-root `.env*` files
- open the project login route
- fill and submit the form with stable `data-testid` selectors
- wait for the authenticated route
- optionally dismiss common post-login overlays configured for that project

## When to use it

- the page requires auth before testing
- the task needs a ready-to-use session quickly
- repeated manual login steps are making the browser flow noisy

## If it fails

Inspect source before guessing:

1. login route/component
2. shared input/button wrappers
3. route config and post-login redirects

Then update the script or add a more stable primitive as described in `automation-primitives.md`.

## Pair with agent-verify

Use session name `agent-verify-{TICKET}` when bootstrapping auth for a verification run, then continue with Playwright capture or browser exploration.
