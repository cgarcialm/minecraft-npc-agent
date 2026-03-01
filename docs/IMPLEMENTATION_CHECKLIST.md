# Implementation Checklist

Use this checklist for the Implementation Agent before handing off to testing/review.

## Implementation Objective
Deliver checkpoint-scoped code changes that are correct, minimal, and ready for validation.

## Scope Control (Always)
1. Work only on the active checkpoint scope from `docs/PROJECT_PLAN.md`.
2. Keep changes focused; avoid unrelated refactors.
3. Prefer changes in `agent_ts/src` unless checkpoint scope requires otherwise.
4. Preserve local-first defaults and current locked decisions.

## Non-Negotiable Implementation Gates
1. Checkpoint alignment
- Every changed file maps to an active checkpoint requirement.
- Out-of-scope requests are documented and deferred.

2. Safety/policy alignment
- Safety controls are preserved or intentionally updated per plan.
- `action_build` policy for the active phase is respected.

3. Behavior clarity
- New behavior is explicit in code paths and logs.
- Failure modes are handled without hard crash.

4. Test-with-change rule
- Behavioral changes include corresponding test additions/updates in same branch.
- If behavior is unchanged, state why no test updates were needed.

5. Buildability
- Code compiles (`npm run build` in `agent_ts`).

If any non-negotiable gate fails, do not hand off.

## Implementation Workflow
1. Confirm checkpoint scope and acceptance gate.
2. Create/update branch from latest `main` following plan branch workflow.
3. Implement in small, reviewable commits.
4. Update config/docs only when required by behavior changes.
5. Run baseline validation before handoff.

## Required Handoff Notes (to Testing/Review Agents)
1. Summary of code changes by file.
2. Behavioral changes and expected outcomes.
3. Known risks/assumptions.
4. Commands run and results (`build`, plus any local checks).
5. Explicit list of tests added/updated (or rationale for none).

## Checkpoint Scope Reference
Checkpoint-specific scope and acceptance criteria live only in:
1. `docs/PROJECT_PLAN.md`

## Completion Criteria
Implementation is complete only if:
1. Checkpoint scope is met.
2. Non-negotiable gates pass.
3. Handoff notes are complete and unambiguous.
