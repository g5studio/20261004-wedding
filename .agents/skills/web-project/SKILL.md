---
name: web-project
description: Shared TypeScript and JavaScript web coding standards plus agent self-verification for web projects — implementation scope, control flow, type safety, naming, constants, time values, code annotations, agent-verify workflow, Playwright capture, and localhost browser automation. Use when writing or reviewing src/**/*.ts and src/**/*.tsx code, implementing features, adding constants, timeouts, comments, @external ticket links, invoking agent-verify, self-verification, agent acceptance, or post-MR QA automation.
---

# Web Project

Shared conventions and agent workflows for TypeScript / JavaScript web projects.

## Before You Code

Start from the module that already owns the behavior. Do not create a new helper, hook, service, component, or constants file by default.

Evaluate in this order and stop at the first suitable option:

1. Extend the existing local condition or function in the current file.
2. Add a small private helper or constant in the same file.
3. Extend an existing domain file when reuse already exists.
4. Create a new file only when no owner fits and the concept is stable.

See `references/implementation-scope-selection.md`.

## Control Flow And Type Safety (CRITICAL)

- All `if`, `else if`, and `else` branches must use braces, including single-line guards.
- Do not add `@ts-ignore`, `@ts-expect-error`, or `eslint-disable` comments. Fix the type or lint issue directly.
- Do not cast unknown strings/numbers into enumeration or union values with `as`. Add a formatter / parser that validates the value and returns `undefined` or a typed result.

See `references/general-coding-standards.md`.

## Constants And Time Values (CRITICAL)

- Do not place unexplained raw numbers in runtime logic.
- All time-related values must come from the project's shared time constants module.
- Default time constants path: `src/shared/constants/time.constants.ts`. Adjust to match the target project layout.

```ts
// Forbidden
createHttpClient({ timeout: 30000 });
setTimeout(run, 3000);

// Required
createHttpClient({ timeout: httpClientDefaultTimeoutMs });
setTimeout(run, 3 * oneSecondToMilliseconds);
```

Follow local-first constant ownership: same file → domain constants → shared constants module.

See `references/magic-number-and-constants.md` and `references/time-constants.md`.

## Naming

- Files and folders use `kebab-case`.
- Classes, interfaces, and type aliases use `PascalCase`.
- Variables and functions use `camelCase`.
- Boolean values use semantic prefixes such as `is`, `has`, `can`, `should`, or `needs`.
- Use role suffixes when a file has a clear responsibility: `use-*.ts`, `*-service.ts`, `*.constants.ts`.

## Code Annotations

For `src/**/*.{ts,tsx,d.ts}`, use a multi-line block comment immediately above the symbol or property. Explain the declaration's current purpose in plain Traditional Chinese. Add `@external` with a full link and ` - ` change summary when tied to a ticket or requirement.

See `references/code-annotation-format.md`.

## Agent Self-Verify (CRITICAL)

Use when the user invokes **`agent-verify`**, asks for **自我驗證 / 代理驗收 / agent acceptance**, or wants post-MR local QA.

Flow: **Step 0** understanding confirm → **Phase 1** context → **Phase 2** `plan.md` + `spec.json` confirm → **Phase 3** Playwright capture → **Phase 4** publish to MR/Jira.

- Do **not** skip Step 0 or Answer confirm before capture/publish.
- Playwright success does **not** equal PASS — verify screenshots against `verifyPoints`.
- While any item is FAIL, do **not** ask the user to accept/upload results.

```bash
node scripts/run-capture.mjs --ticket={TICKET}
node scripts/run-debug.mjs --ticket={TICKET} --route=/
node scripts/publish-verification-results.mjs --ticket={TICKET} --mr={MR_IID} --update-mr=true --post-jira=true
```

For localhost browser fallback or login bootstrap, see `references/agent-browser-dev-server.md`.

See `references/agent-self-verify.md` and `references/agent-self-verify-workflow.md`.

## Documentation

### Coding standards

- `references/implementation-scope-selection.md`
- `references/general-coding-standards.md`
- `references/magic-number-and-constants.md`
- `references/time-constants.md`
- `references/code-annotation-format.md`

### Agent verification

- `references/agent-self-verify.md`
- `references/agent-self-verify-workflow.md`
- `references/agent-browser-dev-server.md`
- `references/dev-server-workflow.md`
- `references/login-script.md`
- `references/script-authoring.md`
- `references/automation-primitives.md`

### Scripts and templates

- `scripts/run-capture.mjs`
- `scripts/run-debug.mjs`
- `scripts/publish-verification-results.mjs`
- `scripts/spec-utils.mjs`
- `templates/test-plan.template.md`
- `templates/spec.template.json`
- `templates/verification-report.template.md`
- `templates/playwright-popup-guard.template.mjs`
