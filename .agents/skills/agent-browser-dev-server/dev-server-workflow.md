# Dev Server Workflow

Use this loop for one-off localhost interaction before deciding whether the flow needs a reusable script.

## Baseline loop

1. Pick or create a session for the task.
2. Open the exact route you want to test.
3. Wait for the page to settle.
4. Snapshot before interacting.
5. After every DOM-changing action, wait or snapshot again before reusing refs.

```bash
agent-browser --session fluid-dev-server open http://localhost:5173/sportEvents
agent-browser --session fluid-dev-server wait --load networkidle
agent-browser --session fluid-dev-server snapshot -i
```

## Prefer deterministic entry points

- Open the target route directly instead of navigating there through multiple clicks.
- Reuse an existing bootstrap script when the page needs auth, seeded state, or dialog cleanup.
- Prefer query selectors backed by source code over translated text.

If the route requires login first, read [login-script.md](login-script.md).

## Stable interaction order

Prefer this order:

1. `find testid`
2. `eval` against a stable `data-*` attribute or known DOM structure
3. fresh snapshot refs
4. translated text only as debugging context

## Assertions

For state checks, prefer `eval` that returns JSON instead of parsing page text:

```bash
cat <<'EOF' | agent-browser --session fluid-dev-server eval --stdin
(() => JSON.stringify({
  href: window.location.href,
  hasDialog: Boolean(document.querySelector('[data-testid^="overlay-container-"]')),
}))()
EOF
```

## When snapshots are confusing

- Use full `snapshot` instead of only `snapshot -i`.
- Inspect the component and shared wrapper source before guessing a selector.
- Re-check route definitions and state transitions if the page did not land where expected.

If you repeat the same command twice without learning anything new, stop and switch to source-first debugging or script authoring.
