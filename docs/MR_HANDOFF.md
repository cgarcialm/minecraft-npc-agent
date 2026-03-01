# MR Handoff

Fill this file for the active checkpoint MR.

## Implementation Agent
1. Scope implemented:
- Checkpoint 2 (MR2): Ollama primary + rule fallback.
- Reworked `OllamaProvider` to use strict tool-contract JSON parsing and validation (no alias/hardcoded remapping).
- Added one repair retry for invalid Ollama output; if still invalid, provider throws and router fallback handles reliability.
- Added a shared tool contract module intended for reuse by future MCP tool exposure.
2. Files changed (path + rationale):
- `agent_ts/src/providers/ollama-provider.ts`: strict provider prompt contract, parser validation, repair retry flow.
- `agent_ts/src/contracts/action-tools.ts`: shared tool definitions + validation helpers + prompt rendering.
- `agent_ts/src/execution/safety-policy.ts`: now reuses shared tool contract for allowlist/arg validation.
- `agent_ts/src/providers/provider-factory.ts`: Ollama primary wiring with rule fallback.
- `agent_ts/src/config.ts`: added `ollamaBaseUrl` and `ollamaModel`; default provider set to `ollama`.
- `agent_ts/.env.example`: Ollama env defaults.
- `agent_ts/src/tests/ollama-provider.test.ts`: strict validation/repair tests.
- `agent_ts/src/tests/provider-factory-ollama.test.ts`: offline fallback tests.
- `agent_ts/src/tests/action-executor.test.ts`: config fixture fields for Ollama config.
3. Behavioral changes:
- Ollama output must match the shared tool contract exactly; unknown tools or invalid args are rejected.
- Provider performs one repair attempt on invalid model output before failing.
- Router fallback engages when Ollama is unreachable or remains invalid after repair.
4. Risks/assumptions:
- Model quality still affects first-pass validity; repair retry mitigates but does not eliminate malformed outputs.
- Manual LAN runtime smoke test was not executed in this session.

## Testing Agent
1. Commands executed:
- `git status --short`
- `git diff --stat`
- `cd agent_ts && npm run build`
- `cd agent_ts && npm run lint`
- `cd agent_ts && npm test`
2. Results (pass/fail):
- `npm run build`: PASS
- `npm run lint`: PASS
- `npm test`: PASS (22 tests)
- Manual Minecraft LAN runtime smoke: NOT RUN in this session.
3. Tests added/updated:
- Added `agent_ts/src/tests/ollama-provider.test.ts`.
- Added `agent_ts/src/tests/provider-factory-ollama.test.ts`.
- Updated `agent_ts/src/tests/action-executor.test.ts` config fixture.
4. Checklist gates covered:
- Working tree sanity: covered.
- Build/type gate: covered.
- Diff sanity: covered.
- Lint gate: covered.
- Test gate: covered.
- Validation pack B (Ollama/fallback): covered with strict parse validation, repair retry, malformed-output, and offline fallback tests.

## Review Agent
1. Critical findings:
- None.
2. High findings:
- None.
3. Medium findings:
- None.
4. Low findings:
- Bedrock runtime/dependencies remain in repository by design and are scheduled for removal in Checkpoint 4.
5. Final review status:
- No blocking findings.

## Acceptance Gate Mapping
1. Active checkpoint:
- Checkpoint 2 (MR2): Ollama Primary + Rule Fallback.
2. Acceptance criteria item-by-item evidence:
- `npm run build` succeeds: PASS (`cd agent_ts && npm run build`).
- Natural language prompts produce valid actions via Ollama: provider integration and strict-decision tests pass.
- Ollama offline/unreachable falls back reliably: covered by `provider-factory-ollama.test.ts` fallback test.
- No hard crash on malformed model output: malformed/invalid outputs are rejected and retried/fallbacked; tests pass.
- At least 5 existing actions invokable through provider path: action schema compatibility retained from MR1; executor path unchanged.
- CI requires and passes lint + unit tests: local `lint` + `test` pass and existing CI gates remain compatible.
3. Deferred scope:
- Manual LAN smoke validation for Ollama-driven behavior is deferred and should be run before merge.
