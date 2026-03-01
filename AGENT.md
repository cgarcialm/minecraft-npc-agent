# AGENT.md

General execution guide for any new implementation session.
This file is intentionally static and should not require per-MR updates.

## How to Start Any Session
1. Read in this order:
   - `docs/PROJECT_PLAN.md`
   - `docs/IMPLEMENTATION_CHECKLIST.md`
   - `docs/TESTING_CHECKLIST.md`
   - `docs/REVIEW_CHECKLIST.md`
2. Determine the next MR/checkpoint by:
   - inspecting merged PRs / git history, and
   - selecting the next incomplete checkpoint in `docs/PROJECT_PLAN.md`.
3. Create/use the branch name defined by the plan naming convention.

## Expected Behavior
1. Implement exactly one checkpoint per branch/MR.
2. Do not jump to later checkpoints unless explicitly requested.
3. Keep changes scoped, reviewable, and aligned to acceptance criteria.
4. Use implementation/testing/review checklists as merge gates.

## Mandatory Pre-Coding Confirmation
Before coding, explicitly confirm:
1. Scope understanding of the selected checkpoint.
2. File-level implementation plan.
3. Validation/test plan and acceptance checks.

Only start coding after this confirmation.

## Default Prompt Pattern
Use this in a new session:
`Implement the next checkpoint from docs/PROJECT_PLAN.md following AGENT.md and the checklists in docs/.`
