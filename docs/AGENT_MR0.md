# AGENT MR0: CI Validation Pipeline

This file is the single-session instruction set for implementing MR0.

## Branch
Work only on:
1. `ci/pipeline-validation`

## Source of Truth
Follow these docs in order:
1. `docs/PROJECT_PLAN.md` (Checkpoint 0 / MR0)
2. `docs/IMPLEMENTATION_CHECKLIST.md`
3. `docs/TESTING_CHECKLIST.md`
4. `docs/REVIEW_CHECKLIST.md`

## Scope (MR0 Only)
Implement merge-request validation pipeline setup:
1. Add/update CI workflow(s) for pull requests.
2. Enforce required baseline gate now:
   - `agent_ts` build/typecheck (`npm run build`)
3. Structure pipeline for future lint/test enforcement without implementing MR1+ features.

Do not:
1. Implement MR1+ runtime features.
2. Change `agent_ts/src` behavior unless strictly required for MR0 CI wiring.

## Mandatory Pre-Coding Confirmation
Before editing files, explicitly confirm:
1. Scope understanding (MR0 only).
2. File-level implementation plan.
3. Validation/test plan and acceptance checks for MR0.

Only start coding after this confirmation.

## Acceptance Criteria (MR0)
1. PR pipeline triggers automatically.
2. Build/type failures block merge.
3. Lint/test stages are structured for rollout (enabled when configured).
4. CI output is clear and failure reasons are visible.

## Required Output in Final Report
1. Files changed and rationale per file.
2. Commands run and results.
3. Acceptance criteria coverage (pass/fail per item).
4. Risks or follow-up notes (if any).

## Commit Guidance
Use focused commits, for example:
1. `ci: add pull request validation workflow`
2. `ci: add build/typecheck gate for agent_ts`
3. `docs: clarify ci usage if needed`
