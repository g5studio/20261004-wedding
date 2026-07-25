---
name: shared-component-deteck
description: Detects whether current code changes match existing shared component scenarios in Tiger App, then asks the user via Answer window which path to take: replace with global shared component, create a scenario wrapper from base shared component, or keep custom implementation.
---

# Shared Component Deteck

Use this skill when code changes look like they may duplicate existing shared UI patterns.

## Required First Read

Before making recommendations, read:

- `reference.md`

## Goal

When the current modification matches known shared component scenarios, **prioritize prompting the user via the Answer window** before continuing implementation.

## Detection Scope

Run detection when changes include UI work such as:

- empty / loading / error state
- button / input / form fields
- dialog / bottom sheet / picker
- list / card / tabs / page wrapper
- media / webview / video
- sports or casino reusable sections

Use `reference.md` as the primary lookup source.

## Workflow

1. Read changed files and identify UI intent by name, layout, and behavior.
2. Match intent against known shared component scenarios in `reference.md`.
3. If at least one strong match is found, open the Answer window immediately with these three options:
   - `1: 由agent協助更換全局共用元件取代自行編寫`
   - `2: 由 agent協助基於底層共用組件另外建立特定場景使用的版本`
   - `3: 不使用共用組件，自行添加`
4. Continue based on the selected option.

## Answer Window Requirement

Use `AskQuestion` (Answer window), not free-text A/B/C prompts.

Suggested structure:

- Title: `偵測到可復用共用元件`
- Question prompt should include:
  - detected scenario
  - candidate shared component(s)
  - expected benefit (consistency, maintenance, speed)

## Option Handling Rules

### Option 1

`1: 由agent協助更換全局共用元件取代自行編寫`

- Replace custom implementation with existing shared component(s).
- Keep behavior unchanged unless user requests optimization.
- Report changed files and replacement mapping.

### Option 2

`2: 由 agent協助基於底層共用組件另外建立特定場景使用的版本`

- Build a feature-specific wrapper on top of `lib/widgets/base` or `lib/widgets/tiger`.
- Keep the wrapper API minimal and scenario-focused.
- Do not copy full shared implementation into feature code.

### Option 3

`3: 不使用共用組件，自行添加`

- Respect user choice and proceed with custom implementation.
- Briefly note why shared component was not selected.

## Output Format

When a match is detected, provide a concise table:

| 偵測場景 | 建議共用元件 | 來源路徑 | 信心 |
|---|---|---|---|
| ... | ... | ... | high/medium |

Then trigger the Answer window.

## Guardrails

- Do not auto-replace without user selection when this skill is triggered.
- Prefer `lib/widgets/tiger` before creating new feature-level wrappers.
- Use feature-local wrapper only when global shared component lacks required scenario behavior.
