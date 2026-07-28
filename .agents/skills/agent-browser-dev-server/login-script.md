# Login Script

Use the existing bootstrap script when a localhost flow needs an authenticated session. Keep the login details in the script and out of the main skill.

## Script

```bash
node .agents/skills/agent-browser-dev-server/scripts/login.mjs
```

The script auto-resolves credentials from repo-root `.env*` files in the default priority order, so the plain command should work most of the time.

Useful options:

```bash
node .agents/skills/agent-browser-dev-server/scripts/login.mjs --session fluid-dev-server
node .agents/skills/agent-browser-dev-server/scripts/login.mjs --base-url http://localhost:4173
node .agents/skills/agent-browser-dev-server/scripts/login.mjs --session fluid-dev-server --skip-dismiss
```

## What it does

- resolves login credentials from `process.env` first, then repo-root `.env*` files
- opens `/login`
- advances into the real account/password form if needed
- fills and submits the form with stable test IDs
- waits for the authenticated route
- optionally dismisses common post-login overlays

## When to use it

- the page requires auth before testing
- the task needs a ready-to-use session quickly
- repeated manual login steps are making the browser flow noisy

## If it fails

Inspect the source before guessing:

1. `src/modules/auth/components/LoginScreen/index.tsx`
2. `src/modules/auth/components/InitScreen/index.tsx`
3. `src/shared/components/Input/index.tsx`
4. `src/shared/components/LoginButtonBar/index.v4.tsx`
5. `src/utilities/config/routes.tsx`

Then update the script or add a more stable primitive as described in [automation-primitives.md](automation-primitives.md).
