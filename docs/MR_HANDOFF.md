# MR Handoff

Fill this file for the active checkpoint MR.

## Implementation Agent
1. Scope implemented:
- Checkpoint 1 (MR1): provider core + rule-only runtime path.
- Added provider interfaces, `RuleProvider`, provider router/fallback, centralized action executor, safety controls, and rewired chat handling in `main.ts` away from direct Bedrock runtime usage.
- Enforced `DISABLE_ACTION_BUILD=true` policy in executor preflight.
- Added runnable local unit-test setup and initial tests for rule parsing, safety behavior, and fallback behavior.
2. Files changed (path + rationale):
- `agent_ts/src/providers/types.ts`: canonical provider/action decision interfaces.
- `agent_ts/src/providers/rule-provider.ts`: deterministic command parsing for required MR1 intents.
- `agent_ts/src/providers/provider-router.ts`: primary provider execution with validated fallback flow.
- `agent_ts/src/providers/provider-factory.ts`: config-driven provider selection (rule-default; unsupported primary -> rule fallback when enabled).
- `agent_ts/src/execution/safety-policy.ts`: allowlist + argument validation rules.
- `agent_ts/src/execution/action-executor.ts`: centralized execution with max-actions, cooldown, timeout, policy checks, and structured action logs.
- `agent_ts/src/main.ts`: runtime rewired to provider -> executor path and required event logging (`message_in`, `provider_selected`, `provider_decision`, `action_start`, `action_result`, `action_error`, `fallback_reason`).
- `agent_ts/src/config.ts`: local-first provider/safety config keys and defaults.
- `agent_ts/src/action-handler.ts`: direct action dispatch support for structured action args and `action_stop`.
- `agent_ts/src/bedrock-bot.ts`: config compatibility fix for optional legacy IDs during transition.
- `agent_ts/package.json`: added `lint` and `test` scripts.
- `agent_ts/src/tests/*.test.ts`: initial unit tests for parser/safety/fallback checkpoints.
3. Behavioral changes:
- Chat messages now flow through provider selection and executor safety gates before action calls.
- Required rule commands are parsed deterministically: `hello`, `come to me`, `jump`, `dig` variants, `find <entity>`, `attack <entity>`, `stop`.
- Invalid/disallowed actions are rejected with non-crashing responses.
- `action_build` is blocked by policy when disabled.
4. Risks/assumptions:
- `OllamaProvider` is intentionally not implemented in MR1; unsupported primary provider currently falls back to rule when enabled.
- LAN/manual runtime checks are still required for in-game pathing behavior and were not executed in this environment.

## Testing Agent
1. Commands executed:
- `git status --short`
- `cd agent_ts && npm run build`
- `cd agent_ts && npm run lint`
- `cd agent_ts && npm test`
2. Results (pass/fail):
- `npm run build`: PASS
- `npm run lint`: PASS
- `npm test`: PASS (13 tests)
3. Tests added/updated (or why none were needed):
- Added `agent_ts/src/tests/rule-provider.test.ts` for rule parsing coverage.
- Added `agent_ts/src/tests/action-executor.test.ts` for allowlist/build-disable, max-actions, cooldown, timeout safety checks.
- Added `agent_ts/src/tests/provider-router.test.ts` for fallback behavior and malformed decision handling.
4. Checklist gates covered:
- Working tree sanity: checked.
- Build/type gate: covered.
- Diff sanity: covered during implementation.
- Lint gate: covered.
- Test gate: covered.
- Validation pack A (Rule Provider / Executor / Safety): covered via unit tests for required logic.
- Manual Minecraft LAN smoke: pending, not executable in this environment.

## Review Agent
1. Critical findings:
- None.
2. High findings:
- None.
3. Medium findings:
- None.
4. Low findings:
- `agent_ts/src/bedrock-bot.ts` remains in repository (expected until MR4) and now uses empty-string fallback for optional IDs; safe for compile but legacy path remains non-target in MR1.
5. Final review status (`No blocking findings` or list unresolved blockers):
- No blocking findings.

## Acceptance Gate Mapping
1. Active checkpoint:
- Checkpoint 1 (MR1): Provider Core + Rule-Only Runtime.
2. Acceptance criteria item-by-item evidence:
- `npm run build` succeeds: PASS (`cd agent_ts && npm run build`).
- Bot starts with no AWS env vars: runtime path in `main.ts` no longer instantiates/uses `BedrockBot`.
- Rule commands work end-to-end: deterministic mappings implemented in `RuleProvider` for all listed MR1 intents.
- Safety guard rejects disallowed/invalid requests without crash: enforced in `ActionExecutor` + tested in `action-executor.test.ts`.
- Logs include provider/action flow: required event logs emitted in `main.ts` and executor.
- Test runner + initial unit tests present and runnable locally: `npm test` runs Node test suite and passes.
3. Any deferred scope (with reason):
- Manual in-game LAN smoke validation deferred to local runtime environment where Minecraft world + bot can be launched.
