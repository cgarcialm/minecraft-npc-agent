# Testing Checklist

Use this before every commit and before merging any pull request.

## Current Testing Status
1. Type checking is available now via `npm run build` (`tsc`).
2. Linting is not guaranteed yet (depends on whether `npm run lint` exists).
3. Automated tests are currently not enforced as a stable baseline:
   - no confirmed project-wide unit test suite is required in CI yet
   - no confirmed project-wide integration test suite is required in CI yet
   - test execution is conditional until test scripts and coverage targets are formalized
4. Manual Minecraft LAN runtime checks are currently required.
5. Policy decision: this is temporary; automated unit tests become required merge gates by MR2.

## Non-Negotiable Gates (Always)
1. Working tree sanity:
```bash
git status --short
```
Pass criteria:
- Only intended files are modified.

2. Build + type check:
```bash
cd agent_ts
npm run build
```
Pass criteria:
- No TypeScript errors.

3. Diff sanity:
```bash
git diff --stat
git diff
```
Pass criteria:
- Changes match intended scope.
- No accidental reintroduction of removed architecture.

4. CI pipeline status (for PR merge):
Pass criteria:
- PR pipeline is green.
- Build/type failures block merge.

5. Test-with-change policy:
Pass criteria:
- Any behavioral code change includes matching unit tests in the same branch.
- If no test changes are included, PR must explain why behavior is unchanged.

## Conditional Gates
1. Lint gate (when configured):
```bash
cd agent_ts
npm run lint
```
Pass criteria:
- Zero lint errors.

2. Test gate (when configured):
```bash
cd agent_ts
npm test
```
Pass criteria:
- Test suite passes.

If lint/test scripts are not configured yet, note the temporary exception in the PR description.
No exception is allowed once MR2 testing enforcement is active.

## Validation Packs (Choose by Change Type)

### A) Rule Provider / Executor / Safety Changes
Run when changing parsing, action dispatch, validation, cooldowns, timeouts, allowlist, or `action_build` policy.

Checks:
1. Command behavior checks:
- `hello`
- `come to me`
- `jump`
- `dig 3x2` (and variants)
- `find zombie`
- `attack zombie`
- `stop`

2. Safety checks:
- disallowed action rejection
- invalid argument rejection
- max-actions limit
- cooldown behavior
- timeout behavior
- `action_build` blocked while disabled

Pass criteria:
- No crashes.
- Clear rejection/fallback messaging.

### B) Ollama / Fallback Changes
Run when changing local LLM provider, prompt contract, JSON parsing, or fallback logic.

Checks:
1. Ollama online:
- natural-language message resolves to valid decision/actions.

2. Malformed output:
- invalid model output does not crash runtime.

3. Ollama offline:
- stop Ollama (or set invalid `OLLAMA_BASE_URL`) and confirm fallback path.

Pass criteria:
- Fallback engages correctly when primary path fails.

### C) Bedrock Removal / Dependency Cleanup
Run when removing legacy code and packages.

Checks:
```bash
cd <repo-root>
rg -n "Bedrock|bedrock|@aws-sdk|InvokeAgent|InvokeModel" agent_ts/src agent_ts/package.json
```
Pass criteria:
- No runtime Bedrock references remain in local-first path.

### D) MCP Tool Surface Changes
Run when adding/updating MCP tool exposure.

Checks:
1. MCP server starts.
2. Exposed tools map to shared executor and safety layer.
3. Disallowed tools/args return structured errors.

Pass criteria:
- MCP and chat entrypoints enforce the same safety policy.

## Manual Runtime Smoke Test (Recommended for Functional Changes)
1. Start Minecraft Java `1.20.1` and open world to LAN.
2. Start bot runtime.
3. Run at least 5 representative commands for changed area.

Pass criteria:
- End-to-end behavior works in game without process crash.

## Pre-Push Final Gate
1. Re-run `npm run build` in `agent_ts`.
2. Re-run relevant validation pack(s).
3. Ensure PR pipeline is green.

If any required gate fails, do not merge.

## Enforcement Rollout
1. MR0: CI enforces build/typecheck.
2. MR1: lint + test runner + initial unit tests are introduced.
3. MR2 onward: CI enforces `npm run lint` and `npm test` as required merge gates.
