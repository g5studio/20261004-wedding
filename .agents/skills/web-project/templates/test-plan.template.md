# Test Plan — {TICKET}

> Status: awaiting user confirm (Phase 2)  
> MR: [MR !{MR_IID}]({MR_URL})  
> Jira: [{TICKET}]({JIRA_URL})

## Verification environment

| Item | Value |
|---|---|
| Base URL | http://localhost:5173 |
| Profile | {ENV_LABEL} |
| Branch | feature/{TICKET} |

## Requirement summary

(Summarize Jira acceptance criteria and MR scope in 1–3 sentences.)

## Test items

> **Also produce**: `tmp/{TICKET}/test-plan/spec.json` (machine-readable, Playwright primary path). Template: `spec.template.json`.

| ID | Title | Preconditions | Steps | Expected result | Screenshot | slug | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| T0 | (example: open home page) | dev server running | 1. Open `/`<br>2. Wait for root element | page renders without blank screen | T0.png | 01-home | | |
| T1 | (example: open feature panel) | T0 PASS | 1. Click nav item<br>2. Wait for panel | target content visible | T1.png | 02-feature | | |

## Execution summary

| ID | Result | Notes |
|---|---|---|
| T0 | | |
| T1 | | |

**Overall**: pending / PASS / FAIL

---

<!-- agent-verify-plan:{TICKET} -->
