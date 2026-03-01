import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderRouter } from '../providers/provider-factory';
import { Config } from '../config';

const baseConfig: Config = {
  mcHost: '127.0.0.1',
  mcUsername: 'Rocky',
  mcAuth: 'offline',
  mcPort: 25565,
  mcVersion: '1.20.1',
  aiProvider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
  enableRuleFallback: true,
  enableSafety: true,
  maxActionsPerMessage: 3,
  disableActionBuild: true,
  actionTimeoutMs: 20000,
  actionCooldownMs: 1500,
};

test('factory router falls back to rule provider when ollama is unreachable', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = async () => {
    throw new Error('connect ECONNREFUSED');
  };

  try {
    const router = createProviderRouter(baseConfig);
    const result = await router.handleMessage({
      user: 'Steve',
      text: 'jump',
      worldState: {},
      memory: {},
    });

    assert.equal(result.providerName, 'rule');
    assert.equal(result.decision.actions[0].name, 'action_jump');
    assert.match(result.fallbackReason ?? '', /ECONNREFUSED/);
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  }
});

test('factory router throws when ollama is unreachable and fallback is disabled', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = async () => {
    throw new Error('network down');
  };

  try {
    const router = createProviderRouter({
      ...baseConfig,
      enableRuleFallback: false,
    });

    await assert.rejects(async () => {
      await router.handleMessage({
        user: 'Steve',
        text: 'jump',
        worldState: {},
        memory: {},
      });
    }, /network down/);
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  }
});
