# Magic Numbers And Constants

Do not place unexplained raw numbers in runtime logic. Convert meaningful values into named constants whose names describe domain purpose.

## Forbidden

```ts
createHttpClient({ timeout: 30000 });
if (retryCount > 3) {
  throw error;
}
```

## Required

```ts
createHttpClient({ timeout: httpClientDefaultTimeoutMs });
if (retryCount > maxRetryCount) {
  throw error;
}
```

## Allowed Raw Literals

Raw numbers are allowed only when they are structurally self-explanatory:

- `0`, `1`, and `-1` for index, length, increment, or sentinel checks.
- Array slicing / pagination primitives when the local API makes the role obvious.
- Numeric values inside the constants file that defines the named constant.
- Standard protocol codes only when wrapped by a named constant before reuse.

When in doubt, name it.

## Placement

Follow local-first ownership:

1. Private constant in the same file for one component / route / client.
2. Existing domain constants file when reused by that domain.
3. Shared constants module only when reused across layers. Default example: `src/shared/constants/*.constants.ts`.
4. Time values belong in the project's time constants module. Default example: `src/shared/constants/time.constants.ts`.

Adjust paths to match the target project's folder conventions.

## Naming

- Use `camelCase` for exported and private constants.
- Include the domain and purpose: `httpClientDefaultTimeoutMs`, `maxRetryCount`.
- Add unit suffixes for measurable values: `Ms`, `Seconds`, `Minutes`, `Bytes`, `Count`, `Limit`, `Size`.
- Boolean constants use `is`, `has`, `can`, `should`, or `needs`.
- Avoid value-only names such as `thirtySeconds`, `threeRetries`, or `defaultNumber`.

Constants should explain why the value exists, not just what the number is.
