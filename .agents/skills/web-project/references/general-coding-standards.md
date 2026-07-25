# General Coding Standards

## Control Flow

All `if`, `else if`, and `else` branches must use braces, including single-line guards.

```ts
// Forbidden
if (!input) return;

// Required
if (!input) {
  return;
}
```

## Type Safety

- Do not add `@ts-ignore`, `@ts-expect-error`, or `eslint-disable` comments. Fix the type or lint issue directly.
- Do not cast unknown strings/numbers into enumeration or union values with `as`. Add a formatter / parser that validates the value and returns `undefined` or a typed result.
- Prefer project utility types such as `Optional<T>`, `Nullable<T>`, and `Maybe<T>` when they make optional value handling clearer.

## Naming

- Files and folders use `kebab-case`: `user-profile-card.tsx`, `http-client.ts`.
- Classes, interfaces, and type aliases use `PascalCase`.
- Variables and functions use `camelCase`.
- Boolean values use semantic prefixes such as `is`, `has`, `can`, `should`, or `needs`.
- Avoid vague names such as `data`, `info`, `temp`, `obj`, and `value` when a domain name is available.

## Semantic Suffixes

Use role suffixes when a file has a clear responsibility:

- `*-component.tsx` or `*.tsx` for UI components.
- `use-*.ts` or `*.hook.ts` for hooks.
- `*-service.ts` or `*-client.ts` for services and external API clients.
- `*.constants.ts` for constants.
- `*.interface.ts` or local exported interfaces for contracts when needed.

Keep names role-based. Prefer descriptive role names over internal codenames in code identifiers.
