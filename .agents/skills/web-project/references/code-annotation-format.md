# Code Annotation Format

Use this reference whenever a code annotation references ticket work, requirements, external docs, or runtime ownership.

## Source Code Annotations

For `src/**/*.{ts,tsx,d.ts}`, use a multi-line block comment immediately above the symbol or property:

```ts
/**
 * 以白話繁體中文說明此宣告目前做什麼、用在什麼情境。
 * @external https://example.atlassian.net/browse/PROJ-1234 - 說明此 ticket 對該宣告做了什麼
 */
```

## Description vs `@external`

Description line:

- Explain the declaration's current purpose in plain Traditional Chinese.
- Focus on behavior or business result, not only implementation detail.

`@external` line:

- Explain what the referenced ticket or document changed in this code.
- Use a full link and append ` - ` plus the change summary on the same line.

## When To Add `@external`

Add `@external` when the change is tied to a known ticket, Confluence page, API spec, or other traceable requirement.

Skip it when no reliable reference exists, but still keep the purpose comment if the declaration is non-obvious.

## Updating Existing Comments

- If the declaration's main behavior changed, rewrite the description to match the current behavior.
- If this is a small fix and the purpose is unchanged, keep the description and add a new `@external` line.
- Preserve prior `@external` lines to keep change history.

## Prohibited Patterns

```ts
/** @external PROJ-1234 */
/** @external https://example.atlassian.net/browse/PROJ-1234 */
/** @external [PROJ-1234](https://example.atlassian.net/browse/PROJ-1234) */
/** normalize payload for pipeline */
```

## Examples

```ts
/**
 * 依使用者輸入推導應執行的查詢流程。
 * @external https://example.atlassian.net/browse/PROJ-1234 - 新增 query-derivation service client
 */
export function createQueryDerivationClient() {}
```

```ts
/**
 * HTTP client 預設逾時時間。
 * @description 讓 service client 的 timeout 不在呼叫端硬編碼。
 * @external https://example.atlassian.net/browse/PROJ-5678 - 新增共享時間常數
 */
export const httpClientDefaultTimeoutMs = 30 * oneSecondToMilliseconds;
```

## Checklist

- [ ] Comment is a multi-line block comment.
- [ ] Description states current purpose in plain Traditional Chinese.
- [ ] Known references use full links.
- [ ] Every `@external` includes ` - ` plus the change summary.
- [ ] No stale purpose description remains after behavior changes.
