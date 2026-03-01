# Review Checklist

Use this checklist for the Review Agent pass before approving/merging any MR.

## Review Objective
Identify and block defects that can cause:
1. behavioral regressions
2. runtime instability
3. safety policy violations
4. missing or insufficient test coverage
5. code quality, maintainability, or standards drift

## Review Scope (Always)
1. Changed files in the MR.
2. Directly impacted runtime flow (provider, executor, safety, config, CI, docs).
3. Acceptance gate for the active checkpoint in `docs/PROJECT_PLAN.md`.

## Reviewer Standards

### 1) Correctness and Reliability
1. New/changed logic matches intended behavior.
2. Error handling is explicit and avoids hard crashes.
3. Async flows are safe (awaiting promises, timeout/cancellation where needed).
4. Edge cases are handled (empty input, malformed payloads, unavailable dependencies).

### 2) Safety and Policy Compliance
1. Safety guards are preserved or intentionally updated:
   - allowlist
   - argument validation
   - action limits/cooldown/timeout
2. `action_build` policy is respected for the active phase.
3. Local-first constraints are preserved (no hidden cloud dependency introduced).

### 3) Code Quality and Maintainability
1. Naming is clear and consistent with project conventions.
2. Logic is cohesive and avoids unnecessary complexity.
3. Duplication is minimized; shared logic is centralized where appropriate.
4. Public interfaces/types remain coherent and stable.
5. Logging is useful, concise, and not noisy.
6. Dead code and commented-out legacy paths are not introduced.

### 4) Architecture and Boundaries
1. Changes stay within checkpoint scope and intended directories.
2. Layer boundaries are respected (provider vs executor vs safety vs transport).
3. No shortcut coupling that bypasses shared execution/safety paths.
4. Configuration changes are explicit and documented.

### 5) Testing and Validation Quality
1. Behavior changes include matching tests in the same branch.
2. Tests validate meaningful behavior (not only happy path).
3. Required checks from `docs/TESTING_CHECKLIST.md` are present.
4. CI status and key validation evidence are documented in MR notes.
5. Review output is documented under `## Review Agent`.
6. If there are no blocking issues, the review explicitly states `No blocking findings`.

If any standard above fails in a way that risks correctness, safety, or maintainability, request changes and block merge.

## Checkpoint Scope Reference
Checkpoint-specific scope and acceptance criteria live only in:
1. `docs/PROJECT_PLAN.md`

## Severity and Reporting Format
Report findings in this order:
1. Critical: merge-blocking defects or safety breaks.
2. High: likely regressions or missing required validation.
3. Medium: correctness/usability concerns.
4. Low: cleanup/documentation improvements.

For each finding include:
1. file path + line reference
2. issue summary
3. impact/risk
4. required fix or recommendation

If no findings:
1. State `No blocking findings`.
2. List residual risks or test gaps (if any).

## Review Completion Criteria
Review is complete only if:
1. All critical/high findings are resolved.
2. Acceptance criteria for the checkpoint are satisfied.
3. Testing evidence is present and consistent with checklist policy.
4. Code quality and maintainability standards are satisfied.
