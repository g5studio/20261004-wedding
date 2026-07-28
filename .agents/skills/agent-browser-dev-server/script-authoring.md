# Script Authoring

Use this flow whenever a localhost browser sequence is worth turning into a reusable helper.

## 1. Prove the flow with raw agent-browser commands

Start in a real session and confirm the CLI can already do the job:

- open the exact route you need
- use `wait`, `snapshot`, `find`, and `eval` until the flow works end to end
- keep only the minimum command sequence that is actually required
- prefer direct routes, stable `data-*` attributes, and JSON assertions

Do not script a flow that you have not first proven manually.

## 2. Turn the working commands into a reliable script

Default to a small `.mjs` wrapper around `agent-browser` when the flow needs branching, retries, state checks, or reusable arguments.

The script should:

- accept inputs such as session name, base URL, env file, or timeout
- reuse one named session instead of creating throwaway browser state
- check the current route or DOM state before each step
- make repeated checks idempotent so reruns are safe
- use `eval` that returns JSON for structured assertions
- fail with the current URL and the last known state, not a vague timeout
- avoid translated text as the main selector

Keep scripts focused. One script should do one job well.

## 3. Add one instruction file per script

Every reusable script must get its own markdown file at this skill root. Do not append all scripts into one long reference.

For each script, add a focused instruction file that covers:

- purpose
- command to run
- important options
- success signals
- source files to inspect when it breaks

Recommended layout:

```text
.agents/skills/agent-browser-dev-server/
  SKILL.md
  your-script.md
  scripts/your-script.mjs
```

Only add a short link from `SKILL.md`; keep the script-specific details inside the paired instruction file.

## 4. Prefer better primitives over clever scripts

If the script is getting brittle, stop and improve the app surface first:

- add a stable `data-testid`
- expose a dev-only `window` helper
- add a direct route or query-param entry point
- inspect source to remove unnecessary browser steps

Better primitives make both ad hoc commands and scripts smaller.
