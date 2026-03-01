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
5. Document all three MR roles for each checkpoint:
   - `## Implementation Agent`
   - `## Testing Agent`
   - `## Review Agent`
   - `## Acceptance Gate Mapping`
6. Record role outputs in `docs/MR_HANDOFF.md` (use `docs/MR_HANDOFF_TEMPLATE.md`).

## Mandatory Role Simulation
If only one agent instance is available, execute all three roles sequentially and
document each role using the required headings.
If any required heading is missing, the checkpoint is incomplete.

## Mandatory Pre-Coding Confirmation
Before coding, explicitly confirm:
1. Scope understanding of the selected checkpoint.
2. File-level implementation plan.
3. Validation/test plan and acceptance checks.

Only start coding after this confirmation.

## Default Prompt Pattern
Use this in a new session:
`Implement the next checkpoint from docs/PROJECT_PLAN.md following AGENT.md and the checklists in docs/.`
