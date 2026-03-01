# MCP Agent Architecture Research (Model-Agnostic)

Last updated: 2026-03-01

## Goal
Document a low-technical-debt path for evolving this project from chat->action orchestration into an MCP-ready agent runtime.

## Key Findings
1. MCP is transport/protocol, not orchestration policy.
- MCP defines how tools are discovered (`tools/list`) and invoked (`tools/call`) with JSON schemas.
- It does not force a specific agent loop strategy.

2. Reliable agents use iterative tool loops.
- Anthropic guidance: effective agents are usually an LLM using tools in a feedback loop.
- For game-world tasks (changing state), a single-shot decision is less reliable than stepwise execution with observations.

3. Tool contracts must be strict and shared.
- Use one registry for tool name, input schema, output schema, and descriptions.
- Reuse the same registry for:
  - provider prompt/tool exposure
  - runtime validation
  - future MCP `tools/list` output

4. Keep safety server-side, always.
- Validate tool name/args server-side before execution.
- Keep cooldowns, allowlist, timeouts, and policy checks in executor regardless of model output.

## Recommended Runtime Pattern
1. Discover/define tools (shared registry).
2. Ask model for next tool call(s), not final outcome.
3. Validate tool call against schema and safety policy.
4. Execute one step.
5. Feed structured tool result back to model.
6. Repeat until stop condition or max step limit.
7. If invalid/unavailable/exhausted, fallback deterministically (RuleProvider).

## Why This Fits Future MCP
1. If we build runtime around a shared tool registry now, MCP later is mostly adapter work:
- `tools/list` serializes the existing registry.
- `tools/call` invokes the same executor path already used by chat.
2. This avoids two orchestration stacks (chat logic vs MCP logic), which is the main technical debt risk.

## Latency: Why It Feels Slow
From Ollama metrics, total latency can come from:
1. `load_duration`: model load time (cold starts/unloaded model).
2. `prompt_eval_duration`: prompt/context processing (big prompts/history/tool docs).
3. `eval_duration`: token generation time (model size + output token count).

## Latency Optimization Playbook (Practical)
1. Keep model loaded.
- Use `keep_alive` on `/api/chat` (or `OLLAMA_KEEP_ALIVE` on server) to avoid repeated load costs.
- Verify via `ollama ps`.

2. Reduce prompt size.
- Keep system prompt concise.
- Pass only needed world state for current turn.
- Avoid dumping verbose entity objects/history each turn.

3. Bound output aggressively.
- Keep tool-call outputs short and structured.
- Use lower temperature for deterministic tool selection (`temperature: 0` or near 0).

4. Prefer appropriately sized models.
- If interaction speed matters, use a smaller model variant for tool routing and keep larger models optional.

5. Use one-step tool loop with strict limits.
- `max_steps` (e.g., 3-5), per-step timeout, and early exit rules prevent runaway latency.

6. Stream where useful.
- Even if final execution waits for full tool call, streaming can improve perceived responsiveness.

7. Measure before tuning.
- Log `total_duration`, `load_duration`, `prompt_eval_duration`, `eval_duration`, token counts.
- Tune based on bottleneck:
  - high `load_duration` => keep model warm
  - high `prompt_eval_duration` => shrink context/prompt
  - high `eval_duration` => smaller model/fewer generated tokens

## Project-Specific Next Steps
1. Keep MR2 focused on robust provider loop + strict contracts + fallback.
2. In MR5, expose existing registry/executor via MCP server primitives (no duplicated policy logic).
3. Add integration tests for multi-step intents:
- `hit pig` => find -> approach -> attack
- target not found => explicit user reply
- invalid tool call => repair once, then fallback

## Sources
1. MCP Architecture: https://modelcontextprotocol.io/docs/learn/architecture
2. MCP Tools Concept: https://modelcontextprotocol.io/docs/concepts/tools
3. MCP Tools Specification (2025-06-18): https://modelcontextprotocol.io/specification/2025-06-18/server/tools
4. Anthropic, Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
5. Ollama Tool Calling: https://docs.ollama.com/capabilities/tool-calling
6. Ollama Structured Outputs: https://docs.ollama.com/capabilities/structured-outputs
7. Ollama Chat API: https://docs.ollama.com/api/chat
8. Ollama Usage Metrics: https://docs.ollama.com/api/usage
9. Ollama FAQ (`keep_alive`, context length, model residency): https://docs.ollama.com/faq
