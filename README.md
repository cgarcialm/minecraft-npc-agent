# Minecraft NPC Agent (Local-First)

A Minecraft Java NPC agent built with Mineflayer, evolving from rule-based command handling to local LLM-driven behavior.

This fork started from a Bedrock-oriented upstream project and is being refactored to a local-first runtime.

## Upstream
Original repository:
- https://github.com/build-on-aws/amazon-bedrock-minecraft-agent

## Target Direction (In Progress)
This fork is moving to a local-first architecture:
1. Baseline usage should not require AWS credentials.
2. Rule-based provider is implemented first for stable action execution.
3. Ollama becomes the primary natural-language provider.
4. Rule provider remains as fallback.
5. Bedrock code path is removed from final runtime.

## Project Plan
Planning and checkpoints are documented here:
1. `docs/README.md`

## Core Runtime (Planned)
1. Provider abstraction (`RuleProvider`, `OllamaProvider`).
2. Shared action executor for all provider outputs.
3. Safety layer (allowlist, action limits, cooldown, timeout, arg validation).
4. `action_build` disabled until redesigned for local mode.

## Local Setup
1. Install dependencies:
```bash
cd agent_ts
npm install
```

2. Configure environment:
```bash
cp agent_ts/.env.example agent_ts/.env
```
Current state: env schema is still being finalized during refactor.
Use this as a target example (planned keys, subject to change until MR1/MR2):
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_KEEP_ALIVE=30m
OLLAMA_TEMPERATURE=0
OLLAMA_NUM_PREDICT=128
PROVIDER_TIMEOUT_MS=5000
ENABLE_RESPONSE_SYNTHESIS=true
RESPONSE_SYNTHESIS_TIMEOUT_MS=2500
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

3. Build and run:
```bash
cd agent_ts
npm run build
npm run start:dev
```

## Minecraft Runtime Notes
1. Use Minecraft Java `1.20.1`.
2. Open your single-player world to LAN.
3. Ensure LAN port matches `MC_PORT`.
4. Send commands in chat to the bot.

## Testing and Commit Gates
Before commit or MR, follow:
1. `docs/README.md`

## Status
This repository is in active refactor toward a local-first agent runtime.
Legacy Bedrock-oriented code is still present during the transition and will be removed in planned checkpoints.
