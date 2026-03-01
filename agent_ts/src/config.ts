/**
 * Agent Config
 *
 * Loads config values from environment variables and falls back to local-first defaults.
 */

export interface Config {
  mcHost: string;
  mcUsername: string;
  mcAuth: string;
  mcPort: number;
  mcVersion: string;

  aiProvider: string;
  enableFastPath: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaKeepAlive: string;
  ollamaTemperature: number;
  ollamaNumPredict: number;
  providerTimeoutMs: number;
  enableResponseSynthesis: boolean;
  responseSynthesisTimeoutMs: number;
  enableRuleFallback: boolean;
  enableSafety: boolean;
  maxActionsPerMessage: number;
  disableActionBuild: boolean;
  actionTimeoutMs: number;
  actionCooldownMs: number;

  // Legacy fields kept during transition while Bedrock files still exist.
  agentId?: string;
  agentAliasId?: string;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseFloatNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const loadConfig = async (): Promise<Config> => {
  return {
    mcHost: process.env.MC_HOST || '127.0.0.1',
    mcUsername: process.env.MC_USERNAME || 'Rocky',
    mcAuth: process.env.MC_AUTH || 'offline',
    mcPort: parseNumber(process.env.MC_PORT, 25565),
    mcVersion: process.env.MC_VERSION || '1.20.1',

    aiProvider: process.env.AI_PROVIDER || 'ollama',
    enableFastPath: parseBoolean(process.env.ENABLE_FAST_PATH, true),
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE || '30m',
    ollamaTemperature: parseFloatNumber(process.env.OLLAMA_TEMPERATURE, 0),
    ollamaNumPredict: parseNumber(process.env.OLLAMA_NUM_PREDICT, 128),
    providerTimeoutMs: parseNumber(process.env.PROVIDER_TIMEOUT_MS, 5000),
    enableResponseSynthesis: parseBoolean(process.env.ENABLE_RESPONSE_SYNTHESIS, true),
    responseSynthesisTimeoutMs: parseNumber(process.env.RESPONSE_SYNTHESIS_TIMEOUT_MS, 2500),
    enableRuleFallback: parseBoolean(process.env.ENABLE_RULE_FALLBACK, true),
    enableSafety: parseBoolean(process.env.ENABLE_SAFETY, true),
    maxActionsPerMessage: parseNumber(process.env.MAX_ACTIONS_PER_MESSAGE, 3),
    disableActionBuild: parseBoolean(process.env.DISABLE_ACTION_BUILD, true),
    actionTimeoutMs: parseNumber(process.env.ACTION_TIMEOUT_MS, 20000),
    actionCooldownMs: parseNumber(process.env.ACTION_COOLDOWN_MS, 1500),

    agentId: process.env.AGENT_ID,
    agentAliasId: process.env.AGENT_ALIAS_ID,
  };
};
