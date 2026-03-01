# Project Plan: Local-First Minecraft NPC Agent (Rule-First -> Ollama -> Remove Bedrock)

## Purpose
This is the authoritative execution plan for the project.
It is self-contained and optimized for branch-by-branch delivery with explicit merge request checkpoints.

## Project Context (Starting Point)
1. Repository origin is Bedrock-centered orchestration for Minecraft NPC control.
2. Bot can already connect to Minecraft Java LAN and execute local Mineflayer actions.
3. Current orchestration path depends on AWS Bedrock invocation, which blocks local-only usage without credentials.
4. Most actions (`dig`, `move`, `find`, `attack`, etc.) are local and can run without cloud inference once orchestration is refactored.
5. `action_build` currently depends on Bedrock runtime and must be disabled during local-first rollout.

## Iteration Objectives
1. Establish a stable local execution baseline before LLM integration.
2. Introduce provider abstraction and prove deterministic `RuleProvider` flow first.
3. Add `OllamaProvider` as primary only after action execution and safety guards are validated.
4. Keep reliability via rule fallback when Ollama is unavailable or output is invalid.
5. Remove Bedrock code and dependencies entirely by the end of planned checkpoints.

## Final Product Goal
Build a local-first Minecraft NPC agent that:
1. Works by default without AWS credentials.
2. Executes safe Mineflayer actions from chat instructions.
3. Uses Ollama for natural language interpretation.
4. Uses a rule parser as fallback reliability path.
5. Contains no Bedrock runtime dependency in the final codebase.

## Core Decisions (Locked)
1. Development order: `RuleProvider` first, then `OllamaProvider`.
2. `action_build` in this phase: disabled by policy (`DISABLE_ACTION_BUILD=true`).
3. Bedrock is removed from final architecture, not kept as optional.
4. Changes stay focused in `agent_ts/src` unless dependency cleanup requires `package.json`.

## Target Architecture (Final)

### Decision Types
```ts
interface AgentAction {
  name: string;
  args: Record<string, any>;
}

interface AgentDecision {
  reply?: string;
  actions: AgentAction[];
}

interface AgentProviderInput {
  user: string;
  text: string;
  worldState: any;
  memory: any;
}

interface AgentProvider {
  handleMessage(input: AgentProviderInput): Promise<AgentDecision>;
}
```

### Providers
1. `RuleProvider`: deterministic patterns for known commands.
2. `OllamaProvider`: local LLM HTTP inference for natural language.
3. Factory/orchestrator: primary = Ollama, fallback = Rule (config-driven).

### Execution + Safety Layer
1. Action allowlist.
2. Max actions/message.
3. Cooldown per user/action.
4. Timeout guard for long-running actions.
5. Argument validation before dispatch.
6. `action_build` disabled in this iteration.

### Logging Contract
Log these events per message:
1. `message_in`
2. `provider_selected`
3. `provider_decision`
4. `action_start`
5. `action_result`
6. `action_error`
7. `fallback_reason` (when applicable)

## Delivery Model: Branch + MR Checkpoints
Commit structure is guidance, not a hard contract.
If design evolves, adjust commit grouping as long as each MR remains reviewable and acceptance gates are met.

### Multi-Agent MR Workflow (Required)
Use three focused agents per MR:
1. Implementation Agent
2. Testing Agent
3. Review Agent

Execution order:
1. Implementation Agent delivers scoped code changes for the checkpoint.
2. Testing Agent adds/updates tests and executes checklist validation packs.
3. Review Agent performs a review pass for regressions, safety gaps, and missing tests.

Merge gate:
1. An MR is merge-ready only when all three roles are completed and documented in the MR description.

Required MR notes:
1. Implementation summary (files changed + rationale).
2. Testing evidence (commands run + results).
3. Review findings (issues found/fixed, or explicit "no findings").

Reference checklists:
1. Implementation: `docs/IMPLEMENTATION_CHECKLIST.md`
2. Testing: `docs/TESTING_CHECKLIST.md`
3. Review: `docs/REVIEW_CHECKLIST.md`

### Role Guidelines
Implementation Agent:
1. Stay within checkpoint scope and branch scope.
2. Keep behavior changes testable and update docs/config when required.
3. Do not bypass safety rules or acceptance criteria.

Testing Agent:
1. Apply the `docs/TESTING_CHECKLIST.md` gates relevant to changed areas.
2. Add/update unit tests for all behavior changes.
3. Record exact pass/fail evidence for build, lint/test (when enforced), and runtime checks.

Review Agent:
1. Prioritize bug risk, behavior regressions, safety violations, and missing tests.
2. Verify acceptance gate coverage for the active checkpoint.
3. Block merge if critical findings are unresolved.

### Branch Criteria (All MRs)
1. Create each MR branch from the latest `main`.
2. Use one branch per checkpoint MR; do not mix multiple checkpoints in one MR.
3. Keep branch names descriptive and checkpoint-aligned (examples listed per checkpoint below).
4. Merge order follows checkpoint order unless a documented dependency requires reordering.
5. Do not merge an MR unless its acceptance gate and implementation/testing/review checklist gates are satisfied.
6. Keep each MR focused; unrelated changes must move to a different branch/MR.

### Branch Workflow (Required)
1. Start from `main`:
```bash
git checkout main
git pull origin main
```
2. Create branch from updated `main`:
```bash
git checkout -b <branch-name>
```
3. Keep branch current before opening/updating MR:
```bash
git fetch origin
git rebase origin/main
```
4. Push branch and open MR:
```bash
git push -u origin <branch-name>
```

### Branch Naming Convention
Use: `<type>/<short-scope>`

Examples:
1. `ci/pipeline-validation`
2. `refactor/provider-core-rule`
3. `feat/ollama-fallback`
4. `feat/observability-adapter`
5. `chore/remove-bedrock`
6. `feat/mcp-tool-surface`

## Cross-Cutting Testing Track
Testing is a first-class workstream, not only a final validation step.

### Testing Objectives
1. Enforce build/type safety from the start.
2. Enforce repeatable automated tests for parser/executor/safety logic as a merge requirement.
3. Keep manual LAN runtime checks for end-to-end behavior until automated integration expands.
4. Ensure CI gates block merges on required failures.

### Test-While-Implementing Policy
1. Unit tests must be added/updated in the same branch as behavioral code changes.
2. Parser/executor/safety/provider logic changes are incomplete without corresponding unit tests.
3. Starting at MR2, PRs that change behavior without matching tests should not be merged.

### Testing Implementation Milestones
1. Baseline now: `npm run build` + manual runtime verification.
2. MR1: add lint script and test runner setup.
3. MR1: add initial unit tests for:
   - rule intent parsing
   - safety policies (allowlist, limits, cooldown, timeout)
   - decision parsing and fallback behavior
4. MR2: enforce lint + unit tests in CI as required merge gates.
5. MR3+: add integration tests around provider-to-executor flow.

## Checkpoint 0 (MR0): MR Validation Pipeline
Branch: `ci/pipeline-validation`

### Scope
1. Add CI workflow(s) to run on pull requests.
2. Enforce minimum MR gates:
   - install dependencies
   - `npm run build` in `agent_ts`
   - lint check (once lint script exists)
   - test suite (once test runner is added)
3. Make CI status required before merge.
4. Fail fast on build/type errors and report clear logs.

### Acceptance Gate (MR0)
1. PRs trigger pipeline automatically.
2. Build/type failures block merge.
3. Lint/test stages run when configured and block merge on failure.
4. CI runtime is stable and reproducible for contributors.

### Optional Commit Examples (MR0)
1. `ci: add pull request validation workflow`
2. `ci: add build and typecheck job for agent_ts`
3. `ci: add lint and test jobs with conditional gating`
4. `docs: add ci requirements and troubleshooting notes`

## Checkpoint 1 (MR1): Provider Core + Rule-Only Runtime
Branch: `refactor/provider-core-rule-only`

### Scope
1. Add provider interfaces and provider factory.
2. Implement `RuleProvider` for:
   - `hello`
   - `come to me`
   - `jump`
   - `dig 3x2`, `dig 3 by 2`, `dig a 3 by 2 hole`
   - `find zombie`
   - `attack zombie`
   - `stop`
3. Add centralized action executor with safety controls.
4. Rewire `main.ts` to provider + executor path.
5. Remove Bedrock from runtime path (no direct `BedrockBot` usage in `main.ts`).
6. Enforce `DISABLE_ACTION_BUILD=true` behavior.

### Acceptance Gate (MR1)
1. `npm run build` succeeds.
2. Bot starts with no AWS env vars.
3. Rule commands above work end-to-end.
4. Safety guard rejects disallowed/invalid action requests without crash.
5. Logs include provider/action flow.
6. Test runner and initial unit tests are present and runnable locally.

### Optional Commit Examples (MR1)
1. `feat(provider): add agent provider interfaces and config flags`
2. `feat(rule): implement deterministic rule provider intents`
3. `feat(executor): add action executor with safety checks`
4. `refactor(main): wire chat flow through provider and executor`
5. `feat(safety): disable action_build in local mode`

## Checkpoint 2 (MR2): Ollama Primary + Rule Fallback
Branch: `feat/ollama-primary-with-rule-fallback`

### Scope
1. Add `OllamaProvider` using:
   - `OLLAMA_BASE_URL`
   - `OLLAMA_MODEL`
2. Prompt model for strict JSON `AgentDecision`.
3. Validate and sanitize provider output.
4. On Ollama failure or parse failure, fallback to `RuleProvider` when enabled.

### Acceptance Gate (MR2)
1. `npm run build` succeeds.
2. Natural language prompts produce valid actions via Ollama.
3. When Ollama is offline/unreachable, rule fallback executes reliably.
4. No hard crash on malformed model output.
5. At least 5 existing actions are invokable through provider path.
6. CI requires and passes lint + unit test gates.

### Optional Commit Examples (MR2)
1. `feat(ollama): add local llm provider`
2. `feat(parser): strict decision parse and validation`
3. `feat(fallback): add ollama-to-rule fallback behavior`
4. `chore(logging): add provider decision and fallback logs`

## Checkpoint 3 (MR3): Observability Baseline + Telemetry Adapter
Branch: `feat/observability-telemetry-adapter`

### Scope
1. Introduce a telemetry adapter interface in the runtime path.
2. Emit structured local JSON events for:
   - message input
   - provider selected
   - decision parse/fallback reason
   - action start/result/error
   - timing/latency
3. Keep telemetry sink local-first by default.
4. Add optional Langfuse sink behind adapter without changing core orchestration logic.

### Acceptance Gate (MR3)
1. `npm run build` succeeds.
2. Telemetry events are consistently produced for chat and action lifecycle.
3. Core runtime behavior remains unchanged (observability is non-breaking).
4. Optional external sink can be enabled without modifying provider/executor internals.

### Optional Commit Examples (MR3)
1. `feat(obs): add telemetry adapter interface`
2. `feat(obs): emit structured local runtime events`
3. `feat(obs): add optional langfuse sink integration`
4. `docs: add observability configuration and event contract`

## Checkpoint 4 (MR4): Remove Bedrock Code and Dependencies
Branch: `chore/remove-bedrock-code-deps`

### Scope
1. Remove Bedrock runtime classes/files from `agent_ts/src`.
2. Remove Bedrock config fields from `config.ts`.
3. Remove AWS Bedrock dependencies from `agent_ts/package.json`.
4. Clean README/env docs for local-first setup.

### Acceptance Gate (MR4)
1. `npm run build` succeeds.
2. No imports or references to Bedrock/AWS SDK remain in `agent_ts/src`.
3. Bot behavior remains unchanged for rule + Ollama flow.
4. Default run remains no-AWS.

### Optional Commit Examples (MR4)
1. `refactor(cleanup): remove bedrock runtime code`
2. `chore(deps): remove aws bedrock dependencies`
3. `docs: update local-first setup and environment examples`

## Checkpoint 5 (MR5): MCP Tool Exposure for Agent Runtime
Branch: `feat/mcp-tool-surface-v1`

### Scope
1. Add an MCP server layer that exposes approved NPC actions as tools.
2. Keep MCP tool handlers mapped to the same action executor and safety layer used by chat orchestration.
3. Expose initial tool set:
   - `action_jump`
   - `action_move_to_location`
   - `action_dig`
   - `action_find_entity`
   - `action_attack_nearest_entity`
   - `action_get_player_location`
   - `action_get_time`
   - `action_is_raining`
4. Define explicit MCP schemas for tool arguments and responses.
5. Keep `action_build` out of MCP surface until redesigned.

### MCP Safety Rules
1. Reuse allowlist enforcement from executor.
2. Enforce per-tool argument validation.
3. Enforce timeout and cooldown at MCP invocation boundary.
4. Return structured errors for invalid/disallowed requests (no process crash).

### Acceptance Gate (MR5)
1. `npm run build` succeeds.
2. MCP server starts successfully in local mode.
3. Each exposed tool can be invoked through MCP and reaches executor path.
4. Safety policy is enforced consistently for MCP and chat entrypoints.
5. `action_build` is not exposed and remains blocked.

### Optional Commit Examples (MR5)
1. `feat(mcp): add server bootstrap and tool registry`
2. `feat(mcp): expose core action tools with schemas`
3. `feat(mcp): connect tool handlers to shared executor`
4. `feat(safety): enforce policy at mcp boundary`
5. `docs: add mcp usage and local run instructions`

## Environment Configuration (Target)
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
ENABLE_RULE_FALLBACK=true
ENABLE_SAFETY=true
MAX_ACTIONS_PER_MESSAGE=3
DISABLE_ACTION_BUILD=true
ACTION_TIMEOUT_MS=20000
ACTION_COOLDOWN_MS=1500
MC_HOST=127.0.0.1
MC_PORT=25565
MC_VERSION=1.20.1
MC_USERNAME=Rocky
MC_AUTH=offline
```

## Testing Protocol
Use `docs/TESTING_CHECKLIST.md` as the source of truth for pre-commit and PR validation.
At minimum for every functional change:
1. Run `npm run build` in `agent_ts`.
2. Run the relevant validation pack(s) from the checklist.
3. Run a LAN smoke test for behavior changes.
4. Ensure PR pipeline is green before merge.

## Definition of Done (Project)
1. No AWS credentials required for baseline startup and operation.
2. Ollama is primary decision provider.
3. Rule fallback is reliable when Ollama fails.
4. Safety controls enforce deterministic execution boundaries.
5. Bedrock code and dependencies are fully removed.
6. Build is green at each checkpoint.
7. MR pipeline enforces required validation gates before merge.
