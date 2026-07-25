# Implementation Scope Selection

## Purpose

Choose an implementation that fits the real scope of the change. Prefer the module that already owns the behavior, keep public surface area small, and add abstractions only when they remove current complexity.

## Core Principle

Start from the module that already owns the behavior.

Do not create a new helper, service, hook, component, constant file, or shared abstraction by default. First check whether the current layer already has an owner for the behavior.

## Decision Order

Evaluate in this order and stop at the first suitable option:

1. Extend the existing local condition or function in the current file.
2. Add a small private helper or constant in the same file.
3. Extend an existing domain file when reuse already exists.
4. Create a new file only when no owner fits and the concept is stable.

## Layer Fit

Use the project's existing architecture. Typical web-project layers:

- UI components belong in the component layer for render and interaction concerns.
- Hooks belong with the feature or shared hooks area when encapsulating stateful UI logic.
- Services or clients belong where external APIs or providers are wrapped.
- Utilities belong in shared helpers only when the logic is generic and reused.
- Shared constants belong in a shared constants module only when multiple layers or domains reuse them.

Adjust paths to match the target project's folder conventions.

## Avoid Over-Abstraction

Watch for these smells:

- A new exported helper with only one production caller.
- A new shared constant for one feature-specific value.
- Provider-specific settings leaking into UI code instead of staying in the service or client layer.
- A wrapper created for an implementation step instead of a user-facing concern.
- A test requiring production exports that are not needed by runtime code.

## Test Strategy

- Prefer testing public behavior and user-facing contracts.
- Do not export private helpers only for tests.
- If a change is narrow and has no practical test surface, run targeted type checks / runtime checks and document the residual risk.

## Final Checklist

- [ ] The behavior remains near its owner.
- [ ] The change set is as small as the requirement allows.
- [ ] New exports have current production callers.
- [ ] The chosen layer matches the project's architecture.
- [ ] No abstraction exists only for hypothetical future reuse.
