# Automation Primitives

Use these rules to make `agent-browser` work with the dev server more easily and more reliably.

## Prefer stable `data-*` attributes

When the UI is missing a good automation hook, add one instead of relying on translated text, CSS classes, or element order.

Prefer:

1. `data-testid` or another dedicated `data-*` attribute on the real interactive element
2. selectors that come from shared component props already exposed by the codebase
3. attributes that describe intent, not presentation

Avoid:

- localized button text
- placeholder text that changes with i18n
- `nth-child` or brittle DOM depth selectors
- styling classes as the main selector

## Read the source before picking selectors

Before writing a complicated browser command:

- inspect the route component you are testing
- inspect the shared wrapper that renders the actual DOM node
- inspect route config if navigation or redirects look wrong
- confirm where a `testId` prop ends up in the rendered markup

This usually reveals a simpler selector, a better route, or an internal state transition worth checking with `eval`.

## Expose `window` helpers when a browser flow needs app internals

If a task repeatedly needs access to app-only behavior, expose a stable helper on `window` in dev mode instead of rebuilding that logic in every browser command.

Good examples:

- `window.serverErrorHandler(...)`
- `window.switchI18nDisplayMode(...)`

Use this pattern when the helper lets the browser script:

- trigger a known app behavior directly
- switch display/debug modes without clicking through UI
- inspect internal state that is hard to infer from the DOM alone

Guidelines:

- expose helpers only for dev/test usage
- keep the function name and argument shape stable
- return structured data when possible
- attach the helper from a controller, service, or dev-only utility, not from a provider with side effects

## Use `eval` for source-backed assertions

Once a helper or stable selector exists, call it directly:

```bash
cat <<'EOF' | agent-browser --session fluid-dev-server eval --stdin
(() => JSON.stringify({
  href: window.location.href,
  i18nMode: window.switchI18nDisplayMode ? 'available' : 'missing',
  serverErrorHandler: typeof window.serverErrorHandler,
}))()
EOF
```

The best browser automation setup is usually:

- direct route
- stable `data-*` attribute
- minimal `eval`
- small script only when repetition is real
